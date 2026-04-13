import type { z } from "zod";
import type { ITabGroupMode } from "../models/tab-group-mode.model";
import { TabGroupActivationEventRepository } from "../repositories/tab-group-activation-event.repository";
import {
  TabGroupModeRepository,
  type UpdateTabGroupModeDto,
} from "../repositories/tab-group-mode.repository";
import {
  CreateTabGroupSchema,
  TAB_EVOLUTION_MAX_URLS,
  TabEvolutionSchema,
  UpdateTabGroupSchema,
} from "../schemas/productivity.schemas";
import { ProductivityUserSettingsService } from "./productivity-user-settings.service";
import { NotFoundError, ValidationError } from "../utils/errors";
import { sseManager } from "../sse/sse.manager";

const MAX_CUSTOM_TAB_GROUPS = 10;

type CreateTabGroupInput = z.infer<typeof CreateTabGroupSchema>;
type UpdateTabGroupInput = z.infer<typeof UpdateTabGroupSchema>;
type TabEvolutionInput = z.infer<typeof TabEvolutionSchema>;

export interface PublicProductivityTabGroup {
  _id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  urls: string[];
  evolvedDomains: string[];
  evolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTabGroupActivation {
  _id: string;
  userId: string;
  tabGroupId: string;
  tabGroupName: string;
  tabGroupColor: string;
  urlDomains: string[];
  activatedAt: string;
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function domainsFromUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const h = hostFromUrl(u);
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

function stripWwwHost(hostname: string): string {
  const h = hostname.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim());

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError("URLs must use HTTP or HTTPS");
  }

  return parsed.toString();
}

function normalizeUrls(urls: string[]): string[] {
  const normalized = urls.map(normalizeUrl);
  const seen = new Set<string>();

  for (const url of normalized) {
    const key = url.toLowerCase();
    if (seen.has(key)) {
      throw new ValidationError(
        "Duplicate URLs are not allowed in the same group",
      );
    }
    seen.add(key);
  }

  return normalized;
}

export function mergeDefinedUrlsIntoEvolved(
  definedUrls: string[],
  observedUrls: string[],
): string[] {
  // Group observed URLs by hostname, preserving insertion order.
  // When a user navigates github.com → github.com/repo, the observed URL
  // for that host replaces the defined one rather than being appended alongside.
  // Group observed URLs by www-normalized hostname so that e.g.
  // "wikipedia.org" and "www.wikipedia.org" map to the same slot.
  const observedByHost = new Map<string, string[]>();
  for (const raw of observedUrls) {
    try {
      const url = normalizeUrl(raw.trim());
      const host = stripWwwHost(new URL(url).hostname);
      const list = observedByHost.get(host) ?? [];
      list.push(url);
      observedByHost.set(host, list);
    } catch {
      // skip invalid
    }
  }

  const definedHosts = new Set<string>();
  const seen = new Set<string>();
  const out: string[] = [];

  const tryPush = (url: string): boolean => {
    const key = url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    out.push(url);
    return out.length >= TAB_EVOLUTION_MAX_URLS;
  };

  // First pass: for each defined URL slot, use the observed URL(s) on the
  // same www-normalized hostname — this replaces e.g. github.com with
  // github.com/repo, and wikipedia.org with www.wikipedia.org (after redirect).
  for (const raw of definedUrls) {
    try {
      const definedUrl = normalizeUrl(raw.trim());
      const host = stripWwwHost(new URL(definedUrl).hostname);
      definedHosts.add(host);
      const forHost = observedByHost.get(host);
      if (forHost && forHost.length > 0) {
        for (const obsUrl of forHost) {
          if (tryPush(obsUrl)) return out;
        }
      } else {
        if (tryPush(definedUrl)) return out;
      }
    } catch {
      // skip invalid stored URLs
    }
  }

  // Second pass: add observed URLs on new hostnames not covered by defined slots.
  for (const raw of observedUrls) {
    try {
      const url = normalizeUrl(raw.trim());
      const host = stripWwwHost(new URL(url).hostname);
      if (definedHosts.has(host)) continue;
      if (tryPush(url)) return out;
    } catch {
      // skip invalid observed URLs
    }
  }

  if (out.length === 0) {
    throw new ValidationError("At least one valid URL is required");
  }
  return out;
}

function getEvolvedList(row: ITabGroupMode): string[] {
  const e = row.evolvedUrls;
  return Array.isArray(e) && e.length > 0 ? e : [];
}

export function getLaunchUrlList(row: ITabGroupMode): string[] {
  const evolved = getEvolvedList(row);
  const source = evolved.length > 0 ? evolved : row.urls;

  // Deduplicate by www-normalized hostname. Last occurrence wins so that
  // e.g. "www.udemy.com/courses/x" beats the earlier "udemy.com/" for the
  // same domain slot. This also self-heals any previously stored bad data
  // where both "site.com" and "www.site.com" were saved.
  const lastByHost = new Map<string, string>();
  for (const u of source) {
    try {
      lastByHost.set(stripWwwHost(new URL(u).hostname), u);
    } catch {
      /* skip */
    }
  }
  const seenHosts = new Set<string>();
  const out: string[] = [];
  for (const u of source) {
    try {
      const h = stripWwwHost(new URL(u).hostname);
      if (seenHosts.has(h)) continue;
      seenHosts.add(h);
      out.push(lastByHost.get(h)!);
    } catch {
      out.push(u);
    }
  }
  return out;
}

function serializeTabGroup(row: ITabGroupMode): PublicProductivityTabGroup {
  const evolved = getEvolvedList(row);
  return {
    _id: String(row._id),
    userId: String(row.userId),
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sortOrder,
    urls: row.urls,
    evolvedDomains: domainsFromUrls(evolved),
    evolvedAt: row.evolvedAt ? new Date(row.evolvedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function serializeActivation(doc: {
  _id: unknown;
  userId: unknown;
  tabGroupId: unknown;
  tabGroupName: string;
  tabGroupColor: string;
  urls: string[];
  activatedAt: Date;
}): PublicTabGroupActivation {
  return {
    _id: String(doc._id),
    userId: String(doc.userId),
    tabGroupId: String(doc.tabGroupId),
    tabGroupName: doc.tabGroupName,
    tabGroupColor: doc.tabGroupColor,
    urlDomains: domainsFromUrls(doc.urls),
    activatedAt: new Date(doc.activatedAt).toISOString(),
  };
}

export const ProductivityTabGroupService = {
  async getTabGroups(userId: string): Promise<PublicProductivityTabGroup[]> {
    const rows = await TabGroupModeRepository.findByUserId(userId);
    return rows.map((m) => serializeTabGroup(m as ITabGroupMode));
  },

  async getLaunchUrls(userId: string, tabGroupId: string): Promise<string[]> {
    const row = await TabGroupModeRepository.findById(userId, tabGroupId);
    if (!row) {
      throw new NotFoundError("Tab group not found");
    }
    const r = row as ITabGroupMode;
    return getLaunchUrlList(r);
  },

  async createTabGroup(userId: string, body: CreateTabGroupInput) {
    const customCount =
      await TabGroupModeRepository.countCustomByUserId(userId);

    if (customCount >= MAX_CUSTOM_TAB_GROUPS) {
      throw new ValidationError("Maximum 10 custom tab groups allowed");
    }

    const urls = normalizeUrls(body.urls);

    const created = await TabGroupModeRepository.create({
      userId,
      name: body.name,
      color: body.color,
      icon: body.icon,
      urls,
      sortOrder: 0,
    });

    const serialized = serializeTabGroup(created as ITabGroupMode);
    sseManager.emitTabGroupsUpdated(userId, {
      userId,
      updatedAt: serialized.updatedAt,
    });
    return serialized;
  },

  async updateTabGroup(
    userId: string,
    tabGroupId: string,
    body: UpdateTabGroupInput,
  ) {
    const existing = await TabGroupModeRepository.findById(userId, tabGroupId);

    if (!existing) {
      throw new NotFoundError("Tab group not found");
    }

    const isSeeded = (existing as ITabGroupMode).sortOrder > 0;
    if (
      isSeeded &&
      (body.name !== undefined ||
        body.color !== undefined ||
        body.icon !== undefined)
    ) {
      throw new ValidationError(
        "Template tab groups can only be updated via URLs",
      );
    }

    const patch: UpdateTabGroupModeDto = { ...body };

    if (body.urls !== undefined) {
      patch.urls = normalizeUrls(body.urls);
      patch.evolvedUrls = [];
      patch.evolvedAt = null;
    }

    const updated = await TabGroupModeRepository.update(
      userId,
      tabGroupId,
      patch,
    );

    if (!updated) {
      throw new NotFoundError("Tab group not found");
    }

    const serialized = serializeTabGroup(updated as ITabGroupMode);
    sseManager.emitTabGroupsUpdated(userId, {
      userId,
      updatedAt: serialized.updatedAt,
    });
    return serialized;
  },

  async deleteTabGroup(userId: string, tabGroupId: string): Promise<void> {
    const existing = await TabGroupModeRepository.findById(userId, tabGroupId);

    if (!existing) {
      throw new NotFoundError("Tab group not found");
    }

    if ((existing as ITabGroupMode).sortOrder > 0) {
      throw new ValidationError("Template tab groups cannot be deleted");
    }

    const deleted = await TabGroupModeRepository.deleteById(userId, tabGroupId);

    if (!deleted) {
      throw new NotFoundError("Tab group not found");
    }

    sseManager.emitTabGroupsUpdated(userId, {
      userId,
      updatedAt: new Date().toISOString(),
    });
  },

  async logTabGroupActivation(
    userId: string,
    tabGroupId: string,
  ): Promise<{ event: PublicTabGroupActivation; launchUrls: string[] }> {
    const row = await TabGroupModeRepository.findById(userId, tabGroupId);

    if (!row) {
      throw new NotFoundError("Tab group not found");
    }

    const launchUrls = getLaunchUrlList(row as ITabGroupMode);

    const raw = await TabGroupActivationEventRepository.create({
      userId,
      tabGroupId: String(row._id),
      tabGroupName: row.name,
      tabGroupColor: row.color,
      urls: launchUrls,
    });

    return {
      event: serializeActivation(raw),
      launchUrls,
    };
  },

  async getRecentTabGroupActivations(
    userId: string,
    limit = 10,
  ): Promise<PublicTabGroupActivation[]> {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const rows = await TabGroupActivationEventRepository.findRecentByUserId(
      userId,
      safeLimit,
    );
    return rows.map((r) =>
      serializeActivation(r as Parameters<typeof serializeActivation>[0]),
    );
  },

  async saveTabEvolution(
    userId: string,
    tabGroupId: string,
    body: TabEvolutionInput,
  ): Promise<PublicProductivityTabGroup> {
    const existing = await TabGroupModeRepository.findById(userId, tabGroupId);

    if (!existing) {
      throw new NotFoundError("Tab group not found");
    }

    const evolutionAllowed =
      await ProductivityUserSettingsService.isTabEvolutionEnabledForUser(
        userId,
      );
    if (!evolutionAllowed) {
      throw new ValidationError(
        "Tab evolution is disabled in productivity settings",
      );
    }

    const row = existing as ITabGroupMode;
    const evolvedUrls = mergeDefinedUrlsIntoEvolved(row.urls ?? [], body.urls);

    const updated = await TabGroupModeRepository.update(userId, tabGroupId, {
      evolvedUrls,
      evolvedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundError("Tab group not found");
    }

    return serializeTabGroup(updated as ITabGroupMode);
  },
};
