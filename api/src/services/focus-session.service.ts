import type { z } from "zod";
import { DomainClassificationRepository } from "../repositories/domain-classification.repository";
import { FocusSessionRepository } from "../repositories/focus-session.repository";
import {
  ActivateFocusDraftSchema,
  EndFocusSessionSchema,
  FocusDraftsQuerySchema,
  FocusHistoryQuerySchema,
  SaveFocusDraftSchema,
  StartFocusSessionSchema,
  UpdateFocusSessionSchema,
} from "../schemas/productivity.schemas";
import { NotFoundError, ValidationError } from "../utils/errors";

type StartFocusSessionInput = z.infer<typeof StartFocusSessionSchema>;
type SaveFocusDraftInput = z.infer<typeof SaveFocusDraftSchema>;
type ActivateFocusDraftInput = z.infer<typeof ActivateFocusDraftSchema>;
type EndFocusSessionInput = z.infer<typeof EndFocusSessionSchema>;
type FocusHistoryQueryInput = z.infer<typeof FocusHistoryQuerySchema>;
type FocusDraftsQueryInput = z.infer<typeof FocusDraftsQuerySchema>;
type UpdateFocusSessionInput = z.infer<typeof UpdateFocusSessionSchema>;

function normalizeDomain(rawDomain: string): string {
  const candidate = rawDomain.trim().toLowerCase();

  try {
    const prefixed =
      candidate.startsWith("http://") || candidate.startsWith("https://")
        ? candidate
        : `https://${candidate}`;
    const parsed = new URL(prefixed);
    return parsed.hostname.toLowerCase();
  } catch {
    return candidate.replace(/^www\./, "");
  }
}

export const FocusSessionService = {
  async getActiveSession(userId: string) {
    return FocusSessionRepository.findActiveByUserId(userId);
  },

  async startSession(userId: string, body: StartFocusSessionInput) {
    const activeSession =
      await FocusSessionRepository.findActiveByUserId(userId);
    if (activeSession) {
      throw new ValidationError("A focus session is already active");
    }

    const domain = normalizeDomain(body.domain);
    const classification =
      await DomainClassificationRepository.findByDomain(domain);
    const label = classification?.label?.trim() ? classification.label : domain;

    return FocusSessionRepository.create({
      userId,
      domain,
      label,
      plannedMins: body.plannedMins,
      startedAt: new Date(),
    });
  },

  async saveDraft(userId: string, body: SaveFocusDraftInput) {
    const domain = normalizeDomain(body.domain);
    const existing = await FocusSessionRepository.findDraftByUserIdAndDomain(
      userId,
      domain,
    );
    if (existing) {
      return existing;
    }

    const fromBody = body.label?.trim();
    const classification =
      await DomainClassificationRepository.findByDomain(domain);
    const label =
      fromBody && fromBody.length > 0
        ? fromBody
        : classification?.label?.trim()
          ? classification.label
          : domain;

    return FocusSessionRepository.createDraft({
      userId,
      domain,
      label,
      plannedMins: body.plannedMins,
    });
  },

  async activateDraftSession(
    userId: string,
    sessionId: string,
    body: ActivateFocusDraftInput,
  ) {
    const activeSession =
      await FocusSessionRepository.findActiveByUserId(userId);
    if (activeSession) {
      throw new ValidationError("A focus session is already active");
    }

    const existing = await FocusSessionRepository.findById(userId, sessionId);
    const isActivatableDraft =
      existing &&
      !existing.startedAt &&
      !existing.endedAt &&
      existing.status !== "active" &&
      existing.status !== "completed" &&
      existing.status !== "abandoned";
    if (!isActivatableDraft) {
      throw new NotFoundError("Focus target not found or already started");
    }

    const plannedMins =
      body.plannedMins !== undefined ? body.plannedMins : existing.plannedMins;

    const updated = await FocusSessionRepository.activateDraft(
      userId,
      sessionId,
      plannedMins,
    );

    if (!updated) {
      throw new NotFoundError("Focus target not found or already started");
    }

    return updated;
  },

  async endSession(
    userId: string,
    sessionId: string,
    body: EndFocusSessionInput,
  ) {
    const existing = await FocusSessionRepository.findById(userId, sessionId);
    if (!existing || existing.status !== "active" || !existing.startedAt) {
      throw new NotFoundError("Focus session not found or already ended");
    }

    const endedAt = new Date();
    const startedAt = new Date(existing.startedAt);
    const elapsedMinutes = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000),
    );

    const updated = await FocusSessionRepository.endSession(
      userId,
      sessionId,
      body.status,
      endedAt,
      elapsedMinutes,
    );

    if (!updated) {
      throw new NotFoundError("Focus session not found or already ended");
    }

    return updated;
  },

  async getHistory(userId: string, query: FocusHistoryQueryInput) {
    return FocusSessionRepository.findByUserId(userId, query.page, query.limit);
  },

  async listDrafts(userId: string, query: FocusDraftsQueryInput) {
    const sessions = await FocusSessionRepository.findDraftsByUserId(
      userId,
      query.limit,
    );
    return { sessions };
  },

  async updateSession(
    userId: string,
    sessionId: string,
    body: UpdateFocusSessionInput,
  ) {
    const existing = await FocusSessionRepository.findById(userId, sessionId);
    if (!existing) {
      throw new NotFoundError("Focus session not found");
    }

    const patch: {
      label?: string;
      domain?: string;
      plannedMins?: number | null;
    } = {};
    if (body.label !== undefined) {
      patch.label = body.label.trim();
    }
    if (body.domain !== undefined) {
      patch.domain = normalizeDomain(body.domain);
    }
    if (body.plannedMins !== undefined) {
      patch.plannedMins = body.plannedMins;
    }

    const updated = await FocusSessionRepository.updateById(
      userId,
      sessionId,
      patch,
    );
    if (!updated) {
      throw new NotFoundError("Focus session not found");
    }
    return updated;
  },

  async deleteSession(userId: string, sessionId: string) {
    const existing = await FocusSessionRepository.findById(userId, sessionId);
    if (!existing) {
      throw new NotFoundError("Focus session not found");
    }
    if (existing.status === "active") {
      throw new ValidationError("End the focus session before removing it");
    }

    const deleted = await FocusSessionRepository.deleteById(userId, sessionId);
    if (!deleted) {
      throw new NotFoundError("Focus session not found");
    }
  },
};
