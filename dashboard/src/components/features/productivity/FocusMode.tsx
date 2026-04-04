import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { FocusSession } from "@/types/shared/productivity.types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  useActiveFocusSession,
  useDeleteFocusSession,
  useEndFocusSession,
  useFocusSessionHistory,
  useUpdateFocusSession,
} from "@/api/useProductivity";
import {
  saveFocusDraft,
  type UpdateFocusSessionInput,
} from "@/api/productivity.api";
import type { BrowsingDomainStatRow } from "@/api/browsing.api";
import {
  useBrowsingDomainStats,
  useBrowsingCategories,
} from "@/api/useBrowsing";
import { ConfigureSectionSkeleton } from "@/components/features/configure/shared/ConfigureSectionSkeleton";
import { ProductivityDomainSuggestionRow } from "@/components/features/productivity/shared/ProductivityDomainSuggestionRow";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { FocusModal } from "./FocusModal";
import { FocusSessionEditModal } from "./FocusSessionEditModal";

const SESSION_LIST_LIMIT = 100;
const MAX_SUGGESTED_DOMAINS = 6;
const FOCUS_QUERY_ROOT = ["productivity", "focus"] as const;

const FOCUS_CONFIGURE_CARD_CLASS =
  "flex h-[min(24rem,55vh)] max-h-[384px] min-h-0 flex-col overflow-hidden";

function focusTargetMeta(session: FocusSession): string {
  const plannedPart =
    session.plannedMins != null ? `${session.plannedMins}m timer` : "No timer";
  switch (session.status) {
    case "active":
      return `Active · ${plannedPart}`;
    case "draft":
      return `Draft · ${plannedPart}`;
    case "completed":
      return session.actualMins != null
        ? `Completed · ${session.actualMins}m`
        : "Completed";
    case "abandoned":
      return "Abandoned";
    default:
      return plannedPart;
  }
}

export interface FocusModeConfigureHandle {
  commitPendingFocusDrafts: () => Promise<number>;
  resetPendingFocusDrafts: () => void;
}

interface PendingFocusDraft {
  clientId: string;
  label: string;
  domain: string;
  plannedMins: number | null;
}

function elapsedClock(startedAtIso: string): string {
  const startedAt = new Date(startedAtIso);
  const elapsedSec = Math.max(
    0,
    Math.floor((Date.now() - startedAt.getTime()) / 1000),
  );
  const hours = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const secs = elapsedSec % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function parseActionError(error: unknown): string {
  const maybeResponse = error as {
    response?: { data?: { error?: { message?: string } } };
  };
  const message = maybeResponse.response?.data?.error?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function FocusSessionConfigureRow({
  session,
  browsingRow,
  categoryIcon,
  categoryColor,
  onEdit,
  onDelete,
  deletePendingId,
  rowIndex = 0,
}: {
  session: FocusSession;
  browsingRow: BrowsingDomainStatRow | undefined;
  categoryIcon: string | undefined;
  categoryColor: string | undefined;
  onEdit: () => void;
  onDelete: () => void;
  deletePendingId: string | null;
  rowIndex?: number;
}) {
  const isDeleting = deletePendingId === session._id;
  const isActive = session.status === "active";
  const iconUrl = browsingRow?.domainLogo?.trim() || undefined;
  const meta = focusTargetMeta(session);

  return (
    <article
      className={[
        "anim-list-item-enter ui-hover-row rounded-xl border px-4 py-3 transition-colors hover:border-[var(--color-border-strong)]",
        isActive
          ? "border-[var(--color-primary)]/35 bg-[color:rgba(8,145,178,0.04)]"
          : "border-[var(--color-border)] bg-white/55",
      ].join(" ")}
      style={{ animationDelay: `${rowIndex * 35}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            {iconUrl ? (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/80">
                <img
                  src={iconUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </span>
            ) : categoryIcon ? (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80">
                <BrowsingCategoryIconBadge
                  iconName={categoryIcon}
                  color={categoryColor ?? "#6b7280"}
                  size="sm"
                />
              </span>
            ) : (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-[var(--color-text-muted)]">
                <Globe className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-[var(--color-text-heading)]">
              {session.label}
            </h3>
          </div>
          <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">
            {session.domain}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {meta}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit()}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#E2F4FB] hover:text-[var(--color-primary)] disabled:opacity-50"
            aria-label={`Edit ${session.label}`}
          >
            <Pencil size={14} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#FEE2E2] hover:text-[var(--color-danger)] disabled:opacity-50"
            aria-label={`Delete ${session.label}`}
          >
            {isDeleting ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Trash2 size={14} aria-hidden />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function PendingFocusConfigureRow({
  draft,
  browsingRow,
  categoryIcon,
  categoryColor,
  onRemove,
  rowIndex = 0,
}: {
  draft: PendingFocusDraft;
  browsingRow: BrowsingDomainStatRow | undefined;
  categoryIcon: string | undefined;
  categoryColor: string | undefined;
  onRemove: () => void;
  rowIndex?: number;
}) {
  const iconUrl = browsingRow?.domainLogo?.trim() || undefined;
  const plannedMeta =
    draft.plannedMins != null ? `${draft.plannedMins}m planned` : "No timer";
  const meta = `Unsaved · ${plannedMeta}`;

  return (
    <article
      className="anim-list-item-enter ui-hover-row rounded-xl border border-dashed border-[var(--color-primary)]/40 bg-white/55 px-4 py-3 transition-colors hover:border-[var(--color-border-strong)]"
      style={{ animationDelay: `${rowIndex * 35}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            {iconUrl ? (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/80">
                <img
                  src={iconUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </span>
            ) : categoryIcon ? (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80">
                <BrowsingCategoryIconBadge
                  iconName={categoryIcon}
                  color={categoryColor ?? "#6b7280"}
                  size="sm"
                />
              </span>
            ) : (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-[var(--color-text-muted)]">
                <Globe className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-[var(--color-text-heading)]">
              {draft.label}
            </h3>
            <span className="shrink-0 rounded bg-[#E0F2FE] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              Draft
            </span>
          </div>
          <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">
            {draft.domain}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {meta}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onRemove()}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#FEE2E2] hover:text-[var(--color-danger)]"
            aria-label={`Remove ${draft.label}`}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

function mergeFocusSessionPatch(
  session: FocusSession,
  patch: UpdateFocusSessionInput | undefined,
): FocusSession {
  if (!patch || Object.keys(patch).length === 0) return session;
  return {
    ...session,
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.domain !== undefined ? { domain: patch.domain } : {}),
    ...(patch.plannedMins !== undefined
      ? { plannedMins: patch.plannedMins }
      : {}),
  };
}

interface FocusPendingDelete {
  id: string;
  wasActive: boolean;
}

interface FocusModeProps {
  isConfigure?: boolean;
  headerBusy?: boolean;
  onFocusDraftsDirtyChange?: (dirty: boolean) => void;
}

function normalizeDomainForCompare(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) {
    return "";
  }
  try {
    const prefixed =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`;
    return new URL(prefixed).hostname.toLowerCase();
  } catch {
    return raw.replace(/^www\./, "");
  }
}

export const FocusMode = forwardRef<FocusModeConfigureHandle, FocusModeProps>(
  function FocusMode(
    { isConfigure = false, headerBusy = false, onFocusDraftsDirtyChange },
    ref,
  ) {
    const queryClient = useQueryClient();
    const [clock, setClock] = useState("00:00:00");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [draftDomain, setDraftDomain] = useState("");
    const [draftNameHint, setDraftNameHint] = useState("");
    const [pendingFocusDrafts, setPendingFocusDrafts] = useState<
      PendingFocusDraft[]
    >([]);
    const [pendingSessionUpdates, setPendingSessionUpdates] = useState<
      Record<string, UpdateFocusSessionInput>
    >({});
    const [pendingDeletes, setPendingDeletes] = useState<FocusPendingDelete[]>(
      [],
    );

    const pendingFocusDraftsRef = useRef(pendingFocusDrafts);
    pendingFocusDraftsRef.current = pendingFocusDrafts;
    const pendingSessionUpdatesRef = useRef(pendingSessionUpdates);
    pendingSessionUpdatesRef.current = pendingSessionUpdates;
    const pendingDeletesRef = useRef(pendingDeletes);
    pendingDeletesRef.current = pendingDeletes;

    const [actionError, setActionError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [editingSession, setEditingSession] = useState<FocusSession | null>(
      null,
    );
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
      null,
    );

    const { data: activeSession, isLoading: isActiveLoading } =
      useActiveFocusSession();
    const { data: historyData, isLoading: isHistoryLoading } =
      useFocusSessionHistory(1, SESSION_LIST_LIMIT);
    const { data: browsingStats, isLoading: isDomainsLoading } =
      useBrowsingDomainStats({ period: "all" }, { staleTime: 300_000 });
    const browsingDomains = browsingStats?.domains ?? [];
    const { data: browsingCategories = [] } = useBrowsingCategories();

    const endSessionMutation = useEndFocusSession();
    const updateSessionMutation = useUpdateFocusSession();
    const deleteSessionMutation = useDeleteFocusSession();

    const resetPendingFocusDrafts = useCallback(() => {
      if (!isConfigure) {
        return;
      }
      setPendingFocusDrafts([]);
      setPendingSessionUpdates({});
      setPendingDeletes([]);
      onFocusDraftsDirtyChange?.(false);
    }, [isConfigure, onFocusDraftsDirtyChange]);

    const commitPendingFocusDrafts = useCallback(async (): Promise<number> => {
      if (!isConfigure) {
        return 0;
      }
      const creates = [...pendingFocusDraftsRef.current];
      const updates = { ...pendingSessionUpdatesRef.current };
      const deletes = [...pendingDeletesRef.current];
      const hasUpdates = Object.entries(updates).some(
        ([sessionId, payload]) =>
          !deletes.some((d) => d.id === sessionId) &&
          Object.keys(payload).length > 0,
      );
      if (creates.length === 0 && deletes.length === 0 && !hasUpdates) {
        return 0;
      }

      let count = 0;
      for (const p of creates) {
        await saveFocusDraft({
          domain: p.domain,
          plannedMins: p.plannedMins,
          label: p.label,
        });
        count++;
      }

      for (const [sessionId, payload] of Object.entries(updates)) {
        if (deletes.some((d) => d.id === sessionId)) continue;
        if (Object.keys(payload).length === 0) continue;
        await updateSessionMutation.mutateAsync({ sessionId, payload });
        count++;
      }

      for (const { id, wasActive } of deletes) {
        if (wasActive) {
          await endSessionMutation.mutateAsync({
            sessionId: id,
            payload: { status: "abandoned" },
          });
        } else {
          await deleteSessionMutation.mutateAsync(id);
        }
        count++;
      }

      setPendingFocusDrafts([]);
      setPendingSessionUpdates({});
      setPendingDeletes([]);
      onFocusDraftsDirtyChange?.(false);
      await queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "active"],
      });
      await queryClient.invalidateQueries({
        queryKey: [...FOCUS_QUERY_ROOT, "history"],
      });
      return count;
    }, [
      isConfigure,
      onFocusDraftsDirtyChange,
      queryClient,
      updateSessionMutation,
      endSessionMutation,
      deleteSessionMutation,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        commitPendingFocusDrafts,
        resetPendingFocusDrafts,
      }),
      [commitPendingFocusDrafts, resetPendingFocusDrafts],
    );

    const slugToIcon = useMemo(() => {
      const m = new Map<string, string>();
      for (const c of browsingCategories) {
        if (c.slug) m.set(c.slug, c.icon);
      }
      return m;
    }, [browsingCategories]);

    const slugToColor = useMemo(() => {
      const m = new Map<string, string>();
      for (const c of browsingCategories) {
        if (c.slug) m.set(c.slug, c.color);
      }
      return m;
    }, [browsingCategories]);

    const domainVisualByDomain = useMemo(() => {
      const m = new Map<string, BrowsingDomainStatRow>();
      for (const row of browsingDomains) {
        m.set(row.domain.toLowerCase(), row);
      }
      return m;
    }, [browsingDomains]);

    const suggestedDomains = useMemo(() => {
      return [...browsingDomains]
        .sort((a, b) => b.totalActiveTime - a.totalActiveTime)
        .slice(0, MAX_SUGGESTED_DOMAINS);
    }, [browsingDomains]);

    const filteredSuggestedDomains = useMemo(() => {
      const q = searchInput.trim().toLowerCase();
      if (!q) return suggestedDomains;
      return suggestedDomains.filter((d) => {
        const domainText = d.domain.toLowerCase();
        const labelText = (d.label ?? "").toLowerCase();
        return domainText.includes(q) || labelText.includes(q);
      });
    }, [searchInput, suggestedDomains]);

    const modalSuggestions = useMemo(
      () =>
        browsingDomains.slice(0, 20).map((row) => ({
          domain: row.domain,
          label: row.label?.trim() || row.domain,
        })),
      [browsingDomains],
    );

    useEffect(() => {
      if (!activeSession?.startedAt) {
        setClock("00:00:00");
        return;
      }

      const startedAtIso = activeSession.startedAt;
      setClock(elapsedClock(startedAtIso));
      const intervalId = window.setInterval(() => {
        setClock(elapsedClock(startedAtIso));
      }, 1000);

      return () => {
        window.clearInterval(intervalId);
      };
    }, [activeSession]);

    const sessions = historyData?.sessions ?? [];
    const historyRows = useMemo(
      () => sessions.filter((s) => s.status !== "active"),
      [sessions],
    );
    const sessionById = useMemo(() => {
      const m = new Map<string, FocusSession>();
      for (const s of sessions) m.set(s._id, s);
      if (activeSession) m.set(activeSession._id, activeSession);
      return m;
    }, [sessions, activeSession]);

    const mergedActiveSession = useMemo(() => {
      if (!activeSession) return null;
      if (pendingDeletes.some((d) => d.id === activeSession._id)) return null;
      return mergeFocusSessionPatch(
        activeSession,
        pendingSessionUpdates[activeSession._id],
      );
    }, [activeSession, pendingDeletes, pendingSessionUpdates]);

    const mergedHistoryRows = useMemo(() => {
      return historyRows
        .filter((s) => !pendingDeletes.some((d) => d.id === s._id))
        .map((s) => mergeFocusSessionPatch(s, pendingSessionUpdates[s._id]));
    }, [historyRows, pendingDeletes, pendingSessionUpdates]);

    const hasActiveSession = Boolean(activeSession);
    const hasListContent =
      pendingFocusDrafts.length > 0 ||
      Boolean(mergedActiveSession) ||
      mergedHistoryRows.length > 0 ||
      isHistoryLoading;
    const configureTargetCount =
      pendingFocusDrafts.length +
      (mergedActiveSession ? 1 : 0) +
      mergedHistoryRows.length;
    const activeDomainLower =
      mergedActiveSession?.domain.trim().toLowerCase() ??
      activeSession?.domain.trim().toLowerCase() ??
      "";
    const draftDomainSet = useMemo(() => {
      const set = new Set(
        sessions
          .filter((s) => s.status === "draft")
          .map((s) => s.domain.toLowerCase()),
      );
      for (const p of pendingFocusDrafts) {
        set.add(p.domain.toLowerCase());
      }
      return set;
    }, [sessions, pendingFocusDrafts]);

    useEffect(() => {
      if (!isConfigure) return;
      const dirty =
        pendingFocusDrafts.length > 0 ||
        Object.keys(pendingSessionUpdates).length > 0 ||
        pendingDeletes.length > 0;
      onFocusDraftsDirtyChange?.(dirty);
    }, [
      isConfigure,
      pendingFocusDrafts,
      pendingSessionUpdates,
      pendingDeletes,
      onFocusDraftsDirtyChange,
    ]);

    const browsingVisualForSession = (session: FocusSession) => {
      const row = domainVisualByDomain.get(session.domain.toLowerCase());
      return {
        browsingRow: row,
        categoryIcon: row?.categorySlug
          ? slugToIcon.get(row.categorySlug)
          : undefined,
        categoryColor: row?.categorySlug
          ? slugToColor.get(row.categorySlug)
          : undefined,
      };
    };

    const handleOpenModal = (domain = "", nameHint = "") => {
      setDraftDomain(domain);
      setDraftNameHint(nameHint);
      setIsModalOpen(true);
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
      setDraftDomain("");
      setDraftNameHint("");
    };

    const handleSaveDraftFromModal = async (input: {
      label: string;
      domain: string;
      plannedMins: number | null;
    }) => {
      if (!isConfigure) {
        return;
      }
      const clientId = crypto.randomUUID();
      setPendingFocusDrafts((prev) => [...prev, { clientId, ...input }]);
    };

    const handleRemovePendingDraft = (clientId: string) => {
      setPendingFocusDrafts((prev) =>
        prev.filter((p) => p.clientId !== clientId),
      );
    };

    const handleEditSave = async (input: {
      label: string;
      domain: string;
      plannedMins: number | null;
    }) => {
      if (!editingSession) {
        return;
      }
      const server = sessionById.get(editingSession._id);
      if (!server) {
        return;
      }
      const domainNorm = normalizeDomainForCompare(input.domain);
      const payload: UpdateFocusSessionInput = {};
      if (input.label.trim() !== server.label) {
        payload.label = input.label.trim();
      }
      if (domainNorm !== normalizeDomainForCompare(server.domain)) {
        payload.domain = input.domain;
      }
      const prevMins = server.plannedMins ?? null;
      if (input.plannedMins !== prevMins) {
        payload.plannedMins = input.plannedMins;
      }
      if (Object.keys(payload).length === 0) {
        return;
      }
      if (isConfigure) {
        setPendingSessionUpdates((prev) => ({
          ...prev,
          [editingSession._id]: payload,
        }));
        return;
      }
      await updateSessionMutation.mutateAsync({
        sessionId: editingSession._id,
        payload,
      });
    };

    const handleDeleteSession = async (session: FocusSession) => {
      setActionError(null);
      if (isConfigure) {
        setPendingSessionUpdates((prev) => {
          const next = { ...prev };
          delete next[session._id];
          return next;
        });
        setPendingDeletes((prev) => {
          if (prev.some((d) => d.id === session._id)) return prev;
          return [
            ...prev,
            { id: session._id, wasActive: session.status === "active" },
          ];
        });
        return;
      }

      setDeletingSessionId(session._id);
      try {
        if (session.status === "active") {
          await endSessionMutation.mutateAsync({
            sessionId: session._id,
            payload: { status: "abandoned" },
          });
        } else {
          await deleteSessionMutation.mutateAsync(session._id);
        }
      } catch (error: unknown) {
        setActionError(parseActionError(error));
      } finally {
        setDeletingSessionId(null);
      }
    };

    if (!isConfigure) {
      return (
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">
              Focus mode
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Focus mode is a single-site session with an optional timer,
              started from the extension or from Configure.
            </p>
          </div>
          <div className="chart-glass p-6">
            {isActiveLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-10 w-full" />
              </div>
            ) : activeSession ? (
              <div className="space-y-3">
                <p className="section-label">Focus session active</p>
                <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">
                  {activeSession.label}
                </h3>
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[var(--color-primary)]">
                  {clock}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  To rename sites or clean up the list, use Productivity →
                  Configure.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No focus session is running. Start one from the extension side
                panel or from Productivity configuration.
              </p>
            )}
          </div>
        </section>
      );
    }

    if (isActiveLoading) {
      return (
        <ConfigureSectionSkeleton
          title="Focus mode"
          description="Queue and edit targets on the left; Save at the top syncs all focus changes. Start the timer from the extension."
          cardClassName="!mt-0 !bg-transparent !p-0 !shadow-none border-0"
        >
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
            <div
              className={`chart-glass min-w-0 ${FOCUS_CONFIGURE_CARD_CLASS}`}
            >
              <div className="mb-4 flex shrink-0 items-center justify-between">
                <div className="skeleton h-3 w-36" />
                <div className="skeleton h-3 w-14" />
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="skeleton h-16 w-full shrink-0 rounded-xl"
                  />
                ))}
              </div>
            </div>
            <div
              className={`chart-glass min-w-0 ${FOCUS_CONFIGURE_CARD_CLASS}`}
            >
              <div className="shrink-0">
                <div className="skeleton mb-2 h-3 w-40" />
                <div className="skeleton mb-3 mt-1 h-3 w-full max-w-[14rem]" />
              </div>
              <div className="skeleton mb-3 h-9 w-full shrink-0 rounded-lg" />
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="skeleton h-[42px] w-full shrink-0 rounded-xl"
                  />
                ))}
              </div>
            </div>
          </div>
        </ConfigureSectionSkeleton>
      );
    }

    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">
              Focus mode
            </h2>
            <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
              Queue targets and edit or remove rows here; nothing reaches your
              account until you Save at the top. Start the timer from the
              extension — the main Productivity page shows the live session.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            hoverEffect="flat"
            className="productivity-outline-pill shrink-0"
            onClick={() => handleOpenModal()}
          >
            <Plus size={14} />
            New focus
          </Button>
        </div>

        {actionError ? (
          <div className="error-banner mb-4 text-xs text-[var(--color-danger)]">
            {actionError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          <div className={`chart-glass min-w-0 ${FOCUS_CONFIGURE_CARD_CLASS}`}>
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <p className="section-label">Your focus targets</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {configureTargetCount}{" "}
                {configureTargetCount === 1 ? "target" : "targets"}
                {pendingFocusDrafts.length > 0 ||
                Object.keys(pendingSessionUpdates).length > 0 ||
                pendingDeletes.length > 0 ? (
                  <span className="ml-1.5 text-[var(--color-primary)]">
                    · unsaved
                  </span>
                ) : null}
              </p>
            </div>

            {!hasListContent && !isHistoryLoading ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-4 text-center">
                <p className="text-sm text-[var(--color-text-body)]">
                  No focus targets yet.
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Add a domain from the right or use New focus. Launch from the
                  extension.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  hoverEffect="flat"
                  className="productivity-outline-pill mt-4"
                  onClick={() => handleOpenModal()}
                >
                  <Plus size={14} />
                  Add your first target
                </Button>
              </div>
            ) : (
              <div className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto px-2">
                {pendingFocusDrafts.map((draft, idx) => {
                  const row = domainVisualByDomain.get(
                    draft.domain.toLowerCase(),
                  );
                  const categoryIcon = row?.categorySlug
                    ? slugToIcon.get(row.categorySlug)
                    : undefined;
                  const categoryColor = row?.categorySlug
                    ? slugToColor.get(row.categorySlug)
                    : undefined;
                  return (
                    <PendingFocusConfigureRow
                      key={draft.clientId}
                      draft={draft}
                      rowIndex={idx}
                      browsingRow={row}
                      categoryIcon={categoryIcon}
                      categoryColor={categoryColor}
                      onRemove={() => handleRemovePendingDraft(draft.clientId)}
                    />
                  );
                })}
                {mergedActiveSession ? (
                  <FocusSessionConfigureRow
                    key={mergedActiveSession._id}
                    rowIndex={pendingFocusDrafts.length}
                    session={mergedActiveSession}
                    {...browsingVisualForSession(mergedActiveSession)}
                    onEdit={() => setEditingSession(mergedActiveSession)}
                    onDelete={() =>
                      void handleDeleteSession(mergedActiveSession)
                    }
                    deletePendingId={isConfigure ? null : deletingSessionId}
                  />
                ) : null}
                {isHistoryLoading ? (
                  <>
                    <div className="skeleton h-16 w-full rounded-xl" />
                    <div className="skeleton h-16 w-full rounded-xl" />
                  </>
                ) : (
                  mergedHistoryRows.map((session, j) => {
                    const v = browsingVisualForSession(session);
                    const rowBase =
                      pendingFocusDrafts.length + (mergedActiveSession ? 1 : 0);
                    return (
                      <FocusSessionConfigureRow
                        key={session._id}
                        rowIndex={rowBase + j}
                        session={session}
                        browsingRow={v.browsingRow}
                        categoryIcon={v.categoryIcon}
                        categoryColor={v.categoryColor}
                        onEdit={() => setEditingSession(session)}
                        onDelete={() => void handleDeleteSession(session)}
                        deletePendingId={isConfigure ? null : deletingSessionId}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className={`chart-glass min-w-0 ${FOCUS_CONFIGURE_CARD_CLASS}`}>
            <div className="shrink-0">
              <p className="section-label">Domains from your browsing</p>
              <p className="mb-3 mt-1 text-xs text-[var(--color-text-muted)]">
                Search, then Add to open the modal. Launch focus from the
                extension.
              </p>
            </div>

            <TextField
              label="Search domains"
              showLabel={false}
              type="text"
              value={searchInput}
              onChange={setSearchInput}
              onClear={() => setSearchInput("")}
              placeholder="Search suggested domains"
              className="h-9 shrink-0 rounded-xl border py-2 text-sm"
              containerClassName="!space-y-0"
              autoComplete="off"
            />

            <ul className="mt-3 min-h-0 min-w-0 list-none flex-1 space-y-2 overflow-y-auto px-2">
              {isDomainsLoading ? (
                <>
                  <li className="skeleton h-[42px] w-full rounded-xl" />
                  <li className="skeleton h-[42px] w-full rounded-xl" />
                  <li className="skeleton h-[42px] w-full rounded-xl" />
                </>
              ) : suggestedDomains.length === 0 ? (
                <li className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center">
                  <p className="text-sm text-[var(--color-text-body)]">
                    No suggested domains yet.
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Browse for a bit and top domains will show up here.
                  </p>
                </li>
              ) : filteredSuggestedDomains.length === 0 ? (
                <li className="py-2 text-xs text-[var(--color-text-muted)]">
                  No suggested domains match your search.
                </li>
              ) : (
                filteredSuggestedDomains.map((domain, index) => (
                  <li key={domain.domain} className="relative">
                    <ProductivityDomainSuggestionRow
                      domain={domain}
                      index={index}
                      categoryIcon={slugToIcon.get(domain.categorySlug)}
                      categoryColor={slugToColor.get(domain.categorySlug)}
                      isAdded={
                        (activeDomainLower.length > 0 &&
                          domain.domain.toLowerCase() === activeDomainLower) ||
                        draftDomainSet.has(domain.domain.toLowerCase())
                      }
                      addedLabel={
                        activeDomainLower.length > 0 &&
                        domain.domain.toLowerCase() === activeDomainLower
                          ? "Active"
                          : "Added"
                      }
                      addLabel="Add"
                      addDisabled={false}
                      onAdd={(domainName, suggestedName) =>
                        handleOpenModal(domainName, suggestedName ?? "")
                      }
                    />
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <FocusModal
          isOpen={isModalOpen}
          isSaving={false}
          initialDomain={draftDomain}
          initialName={draftNameHint}
          suggestions={modalSuggestions}
          onClose={handleCloseModal}
          onSave={handleSaveDraftFromModal}
        />

        <FocusSessionEditModal
          isOpen={editingSession !== null}
          session={editingSession}
          isSaving={isConfigure ? false : updateSessionMutation.isPending}
          onClose={() => setEditingSession(null)}
          onSave={handleEditSave}
        />
      </section>
    );
  },
);

FocusMode.displayName = "FocusMode";
