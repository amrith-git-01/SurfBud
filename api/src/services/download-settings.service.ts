import { ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import { DownloadSettingsRepository } from "../repositories/download-settings.repository";
import { DownloadRuleRepository } from "../repositories/download-rule.repository";
import { RoutingFolderRepository } from "../repositories/routing-folder.repository";
import { DownloadEventRepository } from "../repositories/download-event.repository";
import { cancelAllRemovalJobsForUser } from "../jobs/queues";
import type {
  GracePeriodMinutes,
  GracePeriodType,
} from "../models/user-download-settings.model";
import type {
  DownloadRuleValue,
  StoredDownloadRuleValue,
} from "../models/user-download-rule.model";
import type { FileCategory } from "../utils/file-utils";

const DEFAULT_DOWNLOAD_SETTINGS = {
  trackingEnabled: true,
  autoRemoveEnabled: false,
  gracePeriodType: "immediate" as GracePeriodType,
  gracePeriodMinutes: 15 as GracePeriodMinutes,
  routingEnabled: false,
};

const INVALID_FOLDER_CHARS_REGEX = /[\\/:*?"<>|]/g;

export interface DownloadSettingsResponse {
  trackingEnabled: boolean;
  autoRemoveEnabled: boolean;
  gracePeriodType: GracePeriodType;
  gracePeriodMinutes: GracePeriodMinutes;
  routingEnabled: boolean;
  domainRules: Array<{
    _id: string;
    domain: string;
    rule: DownloadRuleValue;
  }>;
  routingFolders: Array<{
    _id: string;
    folderName: string;
    category: FileCategory | null;
  }>;
}

export interface UpdateDownloadSettingsInput {
  trackingEnabled?: boolean;
  autoRemoveEnabled?: boolean;
  gracePeriodType?: GracePeriodType;
  gracePeriodMinutes?: GracePeriodMinutes;
  routingEnabled?: boolean;
}

export interface CreateDomainRuleInput {
  domain: string;
  rule: DownloadRuleValue;
}

export interface UpdateDomainRuleInput {
  rule: DownloadRuleValue;
}

export interface CreateRoutingFolderInput {
  folderName: string;
}

export interface UpdateRoutingFolderInput {
  folderName?: string;
  category?: FileCategory | null;
}

export interface RemovalDecisionInput {
  sourceDomain?: string;
}

export interface RemovalDecision {
  shouldAutoRemove: boolean;
  gracePeriodType: GracePeriodType;
  gracePeriodMinutes: GracePeriodMinutes;
}

function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    throw new ValidationError("Please enter a valid domain");
  }

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );

    if (!url.hostname) {
      throw new ValidationError("Please enter a valid domain");
    }

    return url.hostname.toLowerCase();
  } catch {
    throw new ValidationError("Please enter a valid domain");
  }
}

function normalizeDomainSafe(input?: string): string | null {
  if (!input) return null;

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    return url.hostname?.toLowerCase() || null;
  } catch {
    return trimmed;
  }
}

function sanitizeFolderName(input: string): string {
  const sanitized = input
    .replace(INVALID_FOLDER_CHARS_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    throw new ValidationError("Folder name cannot be empty");
  }

  if (sanitized.length > 50) {
    throw new ValidationError("Folder name must be 50 characters or fewer");
  }

  return sanitized;
}

function normalizeDownloadRuleValue(
  rule: StoredDownloadRuleValue,
): DownloadRuleValue {
  if (rule === "never_auto_remove") {
    return "track_keep";
  }

  return rule;
}

export const DownloadSettingsService = {
  async getSettings(userId: string): Promise<DownloadSettingsResponse> {
    await DownloadSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_DOWNLOAD_SETTINGS,
    });

    const [settings, rules, folders] = await Promise.all([
      DownloadSettingsRepository.findByUserId(userId),
      DownloadRuleRepository.findByUserId(userId),
      RoutingFolderRepository.findByUserId(userId),
    ]);

    const scalarSettings = settings ?? DEFAULT_DOWNLOAD_SETTINGS;
    const domainRules = rules
      .filter((rule) => rule.ruleType === "domain" && rule.domain)
      .map((rule) => ({
        _id: String(rule._id),
        domain: rule.domain as string,
        rule: normalizeDownloadRuleValue(rule.rule),
      }));

    const routingFolders = folders.map((folder) => ({
      _id: String(folder._id),
      folderName: folder.folderName,
      category: (folder.category as FileCategory | null) ?? null,
    }));

    return {
      trackingEnabled: scalarSettings.trackingEnabled,
      autoRemoveEnabled: scalarSettings.autoRemoveEnabled,
      gracePeriodType: scalarSettings.gracePeriodType,
      gracePeriodMinutes: scalarSettings.gracePeriodMinutes,
      routingEnabled: scalarSettings.routingEnabled,
      domainRules,
      routingFolders,
    };
  },

  async updateSettings(
    userId: string,
    patch: UpdateDownloadSettingsInput,
  ): Promise<DownloadSettingsResponse> {
    await DownloadSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_DOWNLOAD_SETTINGS,
    });

    await DownloadSettingsRepository.updateByUserId(userId, patch);

    if (patch.trackingEnabled === false || patch.autoRemoveEnabled === false) {
      await Promise.all([
        cancelAllRemovalJobsForUser(userId),
        DownloadEventRepository.markAllScheduledOrPendingAsCancelled(userId),
      ]);
    }

    return this.getSettings(userId);
  },

  async getDomainRules(
    userId: string,
  ): Promise<DownloadSettingsResponse["domainRules"]> {
    const rules = await DownloadRuleRepository.findDomainRulesByUserId(userId);

    return rules
      .filter((rule) => rule.domain)
      .map((rule) => ({
        _id: String(rule._id),
        domain: rule.domain as string,
        rule: normalizeDownloadRuleValue(rule.rule),
      }));
  },

  async createDomainRule(
    userId: string,
    input: CreateDomainRuleInput,
  ): Promise<DownloadSettingsResponse> {
    const domain = normalizeDomain(input.domain);

    const existing = await DownloadRuleRepository.findDomainRuleByDomain(
      userId,
      domain,
    );

    if (existing) {
      throw new ConflictError("A rule for this domain already exists");
    }

    await DownloadRuleRepository.createDomainRule({
      userId,
      domain,
      rule: input.rule,
    });

    return this.getSettings(userId);
  },

  async updateDomainRule(
    userId: string,
    id: string,
    input: UpdateDomainRuleInput,
  ): Promise<DownloadSettingsResponse> {
    const existing = await DownloadRuleRepository.findById(userId, id);

    if (!existing || existing.ruleType !== "domain") {
      throw new NotFoundError("Domain rule not found");
    }

    await DownloadRuleRepository.updateRuleById(userId, id, input.rule);

    return this.getSettings(userId);
  },

  async deleteDomainRule(
    userId: string,
    id: string,
  ): Promise<DownloadSettingsResponse> {
    const existing = await DownloadRuleRepository.findById(userId, id);

    if (!existing || existing.ruleType !== "domain") {
      throw new NotFoundError("Domain rule not found");
    }

    await DownloadRuleRepository.deleteById(userId, id);

    return this.getSettings(userId);
  },

  async getRoutingFolders(
    userId: string,
  ): Promise<DownloadSettingsResponse["routingFolders"]> {
    const folders = await RoutingFolderRepository.findByUserId(userId);

    return folders.map((folder) => ({
      _id: String(folder._id),
      folderName: folder.folderName,
      category: (folder.category as FileCategory | null) ?? null,
    }));
  },

  async createRoutingFolder(
    userId: string,
    input: CreateRoutingFolderInput,
  ): Promise<DownloadSettingsResponse> {
    const folderCount = await RoutingFolderRepository.countByUserId(userId);

    if (folderCount >= 10) {
      throw new ValidationError("Maximum of 10 folders allowed");
    }

    const folderName = sanitizeFolderName(input.folderName);

    await RoutingFolderRepository.create({
      userId,
      folderName,
      category: null,
    });

    return this.getSettings(userId);
  },

  async updateRoutingFolder(
    userId: string,
    id: string,
    input: UpdateRoutingFolderInput,
  ): Promise<DownloadSettingsResponse> {
    const existing = await RoutingFolderRepository.findById(userId, id);

    if (!existing) {
      throw new NotFoundError("Routing folder not found");
    }

    const patch: UpdateRoutingFolderInput = {};

    if (input.folderName !== undefined) {
      patch.folderName = sanitizeFolderName(input.folderName);
    }

    if (input.category !== undefined) {
      if (input.category !== null) {
        await RoutingFolderRepository.clearCategoryMapping(
          userId,
          input.category,
          id,
        );
      }

      patch.category = input.category;
    }

    await RoutingFolderRepository.updateById(userId, id, patch);

    return this.getSettings(userId);
  },

  async deleteRoutingFolder(
    userId: string,
    id: string,
  ): Promise<DownloadSettingsResponse> {
    const existing = await RoutingFolderRepository.findById(userId, id);

    if (!existing) {
      throw new NotFoundError("Routing folder not found");
    }

    await RoutingFolderRepository.deleteById(userId, id);

    return this.getSettings(userId);
  },

  async getRemovalDecision(
    userId: string,
    input: RemovalDecisionInput,
  ): Promise<RemovalDecision> {
    await DownloadSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_DOWNLOAD_SETTINGS,
    });

    const settings =
      (await DownloadSettingsRepository.findByUserId(userId)) ??
      DEFAULT_DOWNLOAD_SETTINGS;

    // Priority 1: master toggles
    if (!settings.trackingEnabled || !settings.autoRemoveEnabled) {
      return {
        shouldAutoRemove: false,
        gracePeriodType: settings.gracePeriodType,
        gracePeriodMinutes: settings.gracePeriodMinutes,
      };
    }

    const normalizedDomain = normalizeDomainSafe(input.sourceDomain);

    // Priority 2: domain rules
    const domainRule = normalizedDomain
      ? await DownloadRuleRepository.findDomainRuleByDomain(userId, normalizedDomain)
      : null;

    if (domainRule?.rule === "dont_track") {
      return {
        shouldAutoRemove: false,
        gracePeriodType: settings.gracePeriodType,
        gracePeriodMinutes: settings.gracePeriodMinutes,
      };
    }

    if (domainRule && normalizeDownloadRuleValue(domainRule.rule) === "track_keep") {
      return {
        shouldAutoRemove: false,
        gracePeriodType: settings.gracePeriodType,
        gracePeriodMinutes: settings.gracePeriodMinutes,
      };
    }

    return {
      shouldAutoRemove: true,
      gracePeriodType: settings.gracePeriodType,
      gracePeriodMinutes: settings.gracePeriodMinutes,
    };
  },
};