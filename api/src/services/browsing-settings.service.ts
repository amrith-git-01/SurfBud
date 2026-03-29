import { ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import { BrowsingRuleRepository } from "../repositories/browsing-rule.repository";
import { BrowsingSettingsRepository } from "../repositories/browsing-settings.repository";
import type { ExtensionSession } from "../types/shared/browsing.types";
import type { BrowsingRuleValue } from "../models/user-browsing-rule.model";

const DEFAULT_BROWSING_SETTINGS = {
  trackingEnabled: true,
  interactionTrackingEnabled: true,
  minSessionDurationSeconds: 10,
  mergeGapSeconds: 30,
};

export interface BrowsingSettingsResponse {
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  domainRules: Array<{
    _id: string;
    domain: string;
    rule: BrowsingRuleValue;
  }>;
}

export interface UpdateBrowsingSettingsInput {
  trackingEnabled?: boolean;
  interactionTrackingEnabled?: boolean;
  minSessionDurationSeconds?: number;
  mergeGapSeconds?: number;
}

export interface CreateBrowsingDomainRuleInput {
  domain: string;
  rule: BrowsingRuleValue;
}

export interface UpdateBrowsingDomainRuleInput {
  rule: BrowsingRuleValue;
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

export const BrowsingSettingsService = {
  async getSettings(userId: string): Promise<BrowsingSettingsResponse> {
    await BrowsingSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_BROWSING_SETTINGS,
    });

    const [settings, rules] = await Promise.all([
      BrowsingSettingsRepository.findByUserId(userId),
      BrowsingRuleRepository.findDomainRulesByUserId(userId),
    ]);

    const scalarSettings = {
      trackingEnabled:
        settings?.trackingEnabled ?? DEFAULT_BROWSING_SETTINGS.trackingEnabled,
      interactionTrackingEnabled:
        settings?.interactionTrackingEnabled ??
        DEFAULT_BROWSING_SETTINGS.interactionTrackingEnabled,
      minSessionDurationSeconds:
        settings?.minSessionDurationSeconds ??
        DEFAULT_BROWSING_SETTINGS.minSessionDurationSeconds,
      mergeGapSeconds:
        settings?.mergeGapSeconds ?? DEFAULT_BROWSING_SETTINGS.mergeGapSeconds,
    };
    const domainRules = rules
      .filter((rule) => rule.ruleType === "domain" && rule.domain)
      .map((rule) => ({
        _id: String(rule._id),
        domain: rule.domain as string,
        rule: rule.rule,
      }));

    return {
      trackingEnabled: scalarSettings.trackingEnabled,
      interactionTrackingEnabled: scalarSettings.interactionTrackingEnabled,
      minSessionDurationSeconds: scalarSettings.minSessionDurationSeconds,
      mergeGapSeconds: scalarSettings.mergeGapSeconds,
      domainRules,
    };
  },

  async updateSettings(
    userId: string,
    patch: UpdateBrowsingSettingsInput,
  ): Promise<BrowsingSettingsResponse> {
    await BrowsingSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_BROWSING_SETTINGS,
    });

    await BrowsingSettingsRepository.updateByUserId(userId, patch);
    return this.getSettings(userId);
  },

  async getDomainRules(
    userId: string,
  ): Promise<BrowsingSettingsResponse["domainRules"]> {
    const rules = await BrowsingRuleRepository.findDomainRulesByUserId(userId);

    return rules
      .filter((rule) => rule.domain)
      .map((rule) => ({
        _id: String(rule._id),
        domain: rule.domain as string,
        rule: rule.rule,
      }));
  },

  async createDomainRule(
    userId: string,
    input: CreateBrowsingDomainRuleInput,
  ): Promise<BrowsingSettingsResponse> {
    const domain = normalizeDomain(input.domain);

    const existing = await BrowsingRuleRepository.findDomainRuleByDomain(
      userId,
      domain,
    );

    if (existing) {
      throw new ConflictError("A rule for this domain already exists");
    }

    await BrowsingRuleRepository.createDomainRule({
      userId,
      domain,
      rule: input.rule,
    });

    return this.getSettings(userId);
  },

  async updateDomainRule(
    userId: string,
    id: string,
    input: UpdateBrowsingDomainRuleInput,
  ): Promise<BrowsingSettingsResponse> {
    const existing = await BrowsingRuleRepository.findById(userId, id);

    if (!existing || existing.ruleType !== "domain") {
      throw new NotFoundError("Domain rule not found");
    }

    await BrowsingRuleRepository.updateRuleById(userId, id, input.rule);

    return this.getSettings(userId);
  },

  async deleteDomainRule(
    userId: string,
    id: string,
  ): Promise<BrowsingSettingsResponse> {
    const existing = await BrowsingRuleRepository.findById(userId, id);

    if (!existing || existing.ruleType !== "domain") {
      throw new NotFoundError("Domain rule not found");
    }

    await BrowsingRuleRepository.deleteById(userId, id);

    return this.getSettings(userId);
  },

  async filterTrackableSessions(
    userId: string,
    sessions: ExtensionSession[],
  ): Promise<ExtensionSession[]> {
    if (sessions.length === 0) return [];

    await BrowsingSettingsRepository.ensureByUserId({
      userId,
      ...DEFAULT_BROWSING_SETTINGS,
    });

    const [settings, rules] = await Promise.all([
      BrowsingSettingsRepository.findByUserId(userId),
      BrowsingRuleRepository.findDomainRulesByUserId(userId),
    ]);

    const resolvedTrackingEnabled =
      settings?.trackingEnabled ?? DEFAULT_BROWSING_SETTINGS.trackingEnabled;
    const resolvedInteractionTrackingEnabled =
      settings?.interactionTrackingEnabled ??
      DEFAULT_BROWSING_SETTINGS.interactionTrackingEnabled;
    const resolvedMinSessionDurationSeconds =
      settings?.minSessionDurationSeconds ??
      DEFAULT_BROWSING_SETTINGS.minSessionDurationSeconds;

    if (!resolvedTrackingEnabled) {
      return [];
    }

    const blockedDomainSet = new Set(
      rules
        .filter((rule) => rule.rule === "dont_track" && typeof rule.domain === "string")
        .map((rule) => (rule.domain as string).toLowerCase()),
    );

    const domainFilteredSessions =
      blockedDomainSet.size === 0
        ? sessions
        : sessions.filter((session) => {
          const normalized = session.domain.trim().toLowerCase();
          return !blockedDomainSet.has(normalized);
        });

    const durationFilteredSessions = domainFilteredSessions.filter(
      (session) =>
        session.durationSeconds >= resolvedMinSessionDurationSeconds,
    );

    if (resolvedInteractionTrackingEnabled) {
      return durationFilteredSessions;
    }

    return durationFilteredSessions.map((session) => ({
      ...session,
      interactions: {
        keypresses: 0,
        clicks: 0,
        scrollEvents: 0,
      },
    }));
  },
};