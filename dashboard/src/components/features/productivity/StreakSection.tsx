import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  CreateStreakInput,
  UpdateStreakInput,
} from "@/api/productivity.api";
import type { BrowsingDomainStatRow } from "@/api/browsing.api";
import {
  useBrowsingDomainStats,
  useBrowsingCategories,
} from "@/api/useBrowsing";
import {
  PRODUCTIVITY_STREAKS_QUERY_KEY,
  useCreateStreak,
  useDeleteStreak,
  useStreaks,
  useUpdateStreak,
} from "@/api/useProductivity";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { ProductivityDomainSuggestionRow } from "@/components/features/productivity/shared/ProductivityDomainSuggestionRow";
import type { UserStreak } from "@/types/shared/productivity.types";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { StreakModal } from "./StreakModal";
import { ConfigureSectionSkeleton } from "@/components/features/configure/shared/ConfigureSectionSkeleton";

const MAX_SUGGESTED_DOMAINS = 6;

const STREAK_CONFIGURE_CARD_CLASS =
  "flex h-[min(24rem,55vh)] max-h-[384px] min-h-0 flex-col overflow-hidden";

const DRAFT_STREAK_ID_PREFIX = "draft:";

function isDraftStreakId(id: string): boolean {
  return id.startsWith(DRAFT_STREAK_ID_PREFIX);
}

function cloneStreaks(list: UserStreak[]): UserStreak[] {
  return list.map((s) => ({
    ...s,
    activeDays: [...s.activeDays],
    evolvedDomains: [...s.evolvedDomains],
  }));
}

function sortStreaks(list: UserStreak[]): UserStreak[] {
  return [...list].sort(
    (a, b) =>
      b.currentStreak - a.currentStreak || a.label.localeCompare(b.label),
  );
}

function streakConfigEqual(a: UserStreak, b: UserStreak): boolean {
  return (
    a.label === b.label &&
    a.domain === b.domain &&
    a.minMinutes === b.minMinutes &&
    JSON.stringify([...a.activeDays].sort((x, y) => x - y)) ===
      JSON.stringify([...b.activeDays].sort((x, y) => x - y))
  );
}

function buildDraftUserStreak(
  input: CreateStreakInput,
  userId: string,
): UserStreak {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  return {
    _id: `${DRAFT_STREAK_ID_PREFIX}${crypto.randomUUID()}`,
    userId,
    label: input.label.trim(),
    domain: input.domain,
    minMinutes: input.minMinutes,
    activeDays: [...input.activeDays].sort((a, b) => a - b),
    currentStreak: 0,
    longestStreak: 0,
    todaySeconds: 0,
    todayDate: day,
    lastMetAt: null,
    skipsUsed: 0,
    isActive: true,
    evolvedDomains: [],
    evolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function browsingDomainHostKey(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    const prefixed =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    return new URL(prefixed).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "");
  }
}

function parseErrorMessage(error: unknown): string {
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

/* compact list view — detailed helpers removed (heatmap + today progress) */

export type StreakSectionConfigureHandle = {
  commitStreakDrafts: () => Promise<void>;
  resetStreakDrafts: () => void;
};

interface StreakSectionProps {
  isConfigure?: boolean;
  headerBusy?: boolean;
  onStreakDraftDirtyChange?: (dirty: boolean) => void;
}

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function activeDaysText(activeDays: number[]): string {
  const sorted = [...new Set(activeDays)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if (
    [1, 2, 3, 4, 5].every((d) => sorted.includes(d)) &&
    !sorted.includes(0) &&
    !sorted.includes(6)
  ) {
    return "Weekdays";
  }
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return "Weekends";
  }
  return sorted
    .map((d) => DAY_LABELS[d] ?? "")
    .filter(Boolean)
    .join(", ");
}

interface StreakCardProps {
  streak: UserStreak;
  isConfigure: boolean;
  isDeleting: boolean;
  isModalOpenRef: MutableRefObject<boolean>;
  onEdit: (streak: UserStreak) => void;
  onDelete: (streakId: string) => Promise<void>;
  onHoverStart?: (streak: UserStreak, event: MouseEvent<HTMLElement>) => void;
  onHoverMove?: (event: MouseEvent<HTMLElement>) => void;
  onHoverEnd?: () => void;
  iconUrl?: string;
  categoryIcon?: string;
  categoryColor?: string;
  rowIndex?: number;
}

function CompactStreakRow({
  streak,
  isConfigure,
  isDeleting,
  isModalOpenRef,
  onEdit,
  onDelete,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
  iconUrl,
  categoryIcon,
  categoryColor,
  rowIndex = 0,
}: StreakCardProps) {
  const scheduleMeta = `${streak.minMinutes}m/day · ${activeDaysText(streak.activeDays)}`;

  return (
    <article
      onMouseEnter={(event) => onHoverStart?.(streak, event)}
      onMouseMove={(event) => onHoverMove?.(event)}
      onMouseLeave={() => onHoverEnd?.()}
      className="anim-list-item-enter ui-hover-row rounded-xl border border-[var(--color-border)] bg-white/55 px-4 py-3 transition-colors hover:border-[var(--color-border-strong)]"
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
                <Globe className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-[var(--color-text-heading)]">
              {streak.label}
            </h3>
            {isConfigure && isDraftStreakId(streak._id) ? (
              <span className="shrink-0 rounded bg-[#E0F2FE] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                Draft
              </span>
            ) : null}
          </div>
          <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">
            {streak.domain}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {scheduleMeta}
          </p>
        </div>

        {isConfigure ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(streak)}
              onMouseEnter={(e) => {
                e.stopPropagation();
                onHoverEnd?.();
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                if (isModalOpenRef.current) return;
                onHoverStart?.(streak, e);
              }}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#E2F4FB] hover:text-[var(--color-primary)] disabled:opacity-50"
              aria-label={`Edit ${streak.label}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => void onDelete(streak._id)}
              onMouseEnter={(e) => {
                e.stopPropagation();
                onHoverEnd?.();
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                if (isModalOpenRef.current) return;
                onHoverStart?.(streak, e);
              }}
              disabled={isDeleting}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[#FEE2E2] hover:text-[var(--color-danger)] disabled:opacity-50"
              aria-label={`Delete ${streak.label}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export const StreakSection = forwardRef<
  StreakSectionConfigureHandle,
  StreakSectionProps
>(function StreakSection(
  { isConfigure = false, headerBusy = false, onStreakDraftDirtyChange },
  ref,
) {
  const queryClient = useQueryClient();
  const { data: streaks = [], isLoading, isError, refetch } = useStreaks();
  const { data: browsingStats, isLoading: isDomainsLoading } =
    useBrowsingDomainStats({ period: "all" }, { staleTime: 300_000 });
  const browsingDomains = browsingStats?.domains ?? [];
  const { data: browsingCategories = [] } = useBrowsingCategories();

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

  const domainVisualByHostKey = useMemo(() => {
    const m = new Map<string, BrowsingDomainStatRow>();
    for (const row of browsingDomains) {
      const key = browsingDomainHostKey(row.domain);
      if (!key) continue;
      const existing = m.get(key);
      if (!existing) {
        m.set(key, row);
        continue;
      }
      const rowHasLogo = Boolean(row.domainLogo?.trim());
      const existingHasLogo = Boolean(existing.domainLogo?.trim());
      const prefer =
        rowHasLogo && !existingHasLogo
          ? row
          : !rowHasLogo && existingHasLogo
            ? existing
            : row.totalActiveTime > existing.totalActiveTime
              ? row
              : existing;
      m.set(key, prefer);
    }
    return m;
  }, [browsingDomains]);

  const createMutation = useCreateStreak();
  const updateMutation = useUpdateStreak();
  const deleteMutation = useDeleteStreak();

  const [draftStreaks, setDraftStreaks] = useState<UserStreak[]>([]);
  const [baselineStreaks, setBaselineStreaks] = useState<UserStreak[]>([]);
  const [dirty, setDirty] = useState(false);
  const streaksRef = useRef(streaks);
  streaksRef.current = streaks;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStreak, setEditingStreak] = useState<UserStreak | null>(null);
  const [draftDomain, setDraftDomain] = useState("");
  const [deletingStreakId, setDeletingStreakId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [hoverPreview, setHoverPreview] = useState<UserStreak | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const isModalOpenRef = useRef(false);

  const sortedServerStreaks = useMemo(() => sortStreaks(streaks), [streaks]);

  useEffect(() => {
    if (!isConfigure) return;
    onStreakDraftDirtyChange?.(dirty);
  }, [dirty, isConfigure, onStreakDraftDirtyChange]);

  useEffect(() => {
    if (!isConfigure || dirty || isLoading || isError) return;
    const next = cloneStreaks(sortedServerStreaks);
    setDraftStreaks(next);
    setBaselineStreaks(next);
  }, [isConfigure, dirty, isLoading, isError, sortedServerStreaks]);

  const sortedDisplayStreaks = useMemo(() => {
    const src = isConfigure ? draftStreaks : streaks;
    return sortStreaks(src);
  }, [isConfigure, draftStreaks, streaks]);

  const activeDomainSet = useMemo(
    () =>
      new Set(
        sortedDisplayStreaks.map((streak) =>
          browsingDomainHostKey(streak.domain),
        ),
      ),
    [sortedDisplayStreaks],
  );

  const commitStreakDrafts = useCallback(async () => {
    if (!isConfigure) return;
    setActionError(null);
    const baselineById = new Map(baselineStreaks.map((s) => [s._id, s]));
    const draftById = new Map(draftStreaks.map((s) => [s._id, s]));
    const toCreate = draftStreaks.filter((s) => isDraftStreakId(s._id));
    const toDelete = baselineStreaks.filter(
      (b) => !isDraftStreakId(b._id) && !draftById.has(b._id),
    );
    const toUpdate = draftStreaks.filter((s) => {
      if (isDraftStreakId(s._id)) return false;
      const b = baselineById.get(s._id);
      return b !== undefined && !streakConfigEqual(b, s);
    });

    try {
      for (const s of toCreate) {
        await createMutation.mutateAsync({
          label: s.label,
          domain: s.domain,
          minMinutes: s.minMinutes,
          activeDays: s.activeDays,
        });
      }
      for (const s of toUpdate) {
        const b = baselineById.get(s._id)!;
        const payload: UpdateStreakInput = {};
        if (s.label !== b.label) payload.label = s.label;
        if (s.domain !== b.domain) payload.domain = s.domain;
        if (s.minMinutes !== b.minMinutes) payload.minMinutes = s.minMinutes;
        if (
          JSON.stringify([...s.activeDays].sort((x, y) => x - y)) !==
          JSON.stringify([...b.activeDays].sort((x, y) => x - y))
        ) {
          payload.activeDays = s.activeDays;
        }
        await updateMutation.mutateAsync({ streakId: s._id, payload });
      }
      for (const b of toDelete) {
        await deleteMutation.mutateAsync(b._id);
      }
      await queryClient.refetchQueries({
        queryKey: PRODUCTIVITY_STREAKS_QUERY_KEY,
      });
      setDirty(false);
    } catch (error: unknown) {
      setActionError(parseErrorMessage(error));
      throw error;
    }
  }, [
    isConfigure,
    baselineStreaks,
    draftStreaks,
    createMutation,
    updateMutation,
    deleteMutation,
    queryClient,
  ]);

  const resetStreakDrafts = useCallback(() => {
    if (!isConfigure) return;
    const next = cloneStreaks(sortStreaks(streaksRef.current));
    setDraftStreaks(next);
    setBaselineStreaks(next);
    setDirty(false);
  }, [isConfigure]);

  useImperativeHandle(
    ref,
    () => ({
      commitStreakDrafts,
      resetStreakDrafts,
    }),
    [commitStreakDrafts, resetStreakDrafts],
  );

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

  const handleOpenModal = (domain = "") => {
    endHoverPreview();
    isModalOpenRef.current = true;
    setEditingStreak(null);
    setDraftDomain(domain);
    setIsModalOpen(true);
  };

  const handleEditStreak = (streak: UserStreak) => {
    endHoverPreview();
    isModalOpenRef.current = true;
    setEditingStreak(streak);
    setDraftDomain("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    isModalOpenRef.current = false;
    setIsModalOpen(false);
    setEditingStreak(null);
    setDraftDomain("");
  };

  const startHoverPreview = (
    streak: UserStreak,
    event: MouseEvent<HTMLElement>,
  ) => {
    if (isModalOpenRef.current) return;
    setHoverPreview(streak);
    setPointer({ x: event.clientX, y: event.clientY });
  };

  const moveHoverPreview = (event: MouseEvent<HTMLElement>) => {
    if (isModalOpenRef.current) return;
    setPointer({ x: event.clientX, y: event.clientY });
  };

  const endHoverPreview = () => {
    setHoverPreview(null);
    setPointer(null);
  };

  const handleCreate = (payload: CreateStreakInput) => {
    setActionError(null);
    if (isConfigure) {
      const userId = useAuthStore.getState().userId ?? "";
      const row = buildDraftUserStreak(payload, userId);
      setDraftStreaks((d) => sortStreaks([...d, row]));
      setDirty(true);
      handleCloseModal();
      return;
    }
    void (async () => {
      try {
        await createMutation.mutateAsync(payload);
        handleCloseModal();
      } catch (error: unknown) {
        setActionError(parseErrorMessage(error));
      }
    })();
  };

  const handleUpdate = (streakId: string, payload: UpdateStreakInput) => {
    setActionError(null);
    if (isConfigure) {
      setDraftStreaks((d) =>
        d.map((s) => {
          if (s._id !== streakId) return s;
          return {
            ...s,
            ...(payload.label !== undefined ? { label: payload.label } : {}),
            ...(payload.domain !== undefined ? { domain: payload.domain } : {}),
            ...(payload.minMinutes !== undefined
              ? { minMinutes: payload.minMinutes }
              : {}),
            ...(payload.activeDays !== undefined
              ? { activeDays: [...payload.activeDays].sort((a, b) => a - b) }
              : {}),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      setDirty(true);
      handleCloseModal();
      return;
    }
    void (async () => {
      try {
        await updateMutation.mutateAsync({ streakId, payload });
        handleCloseModal();
      } catch (error: unknown) {
        setActionError(parseErrorMessage(error));
      }
    })();
  };

  const handleDelete = async (streakId: string) => {
    setActionError(null);
    if (isConfigure) {
      setDraftStreaks((d) => d.filter((s) => s._id !== streakId));
      if (hoverPreview?._id === streakId) endHoverPreview();
      setDirty(true);
      return;
    }

    setDeletingStreakId(streakId);
    try {
      await deleteMutation.mutateAsync(streakId);
      if (hoverPreview?._id === streakId) endHoverPreview();
    } catch (error: unknown) {
      setActionError(parseErrorMessage(error));
    } finally {
      setDeletingStreakId(null);
    }
  };

  useEffect(() => {
    if (!hoverPreview) return;

    const handleUserScroll = () => {
      setHoverPreview(null);
      setPointer(null);
    };

    document.addEventListener("scroll", handleUserScroll, true);

    return () => {
      document.removeEventListener("scroll", handleUserScroll, true);
    };
  }, [hoverPreview]);

  useEffect(() => {
    if (isModalOpen) endHoverPreview();
  }, [isModalOpen]);

  useEffect(() => {
    if (!hoverPreview) return;
    const exists = sortedDisplayStreaks.some((s) => s._id === hoverPreview._id);
    if (!exists) endHoverPreview();
  }, [sortedDisplayStreaks, hoverPreview]);

  if (isLoading) {
    return (
      <ConfigureSectionSkeleton
        title="Streak tracking"
        description="Set streaks here, then use Save at the top to sync. Cancel discards unsaved changes."
        cardClassName="!mt-0 !bg-transparent !p-0 !shadow-none border-0"
      >
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          <div className={`chart-glass min-w-0 ${STREAK_CONFIGURE_CARD_CLASS}`}>
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3 w-16" />
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
          <div className={`chart-glass min-w-0 ${STREAK_CONFIGURE_CARD_CLASS}`}>
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
            Streak tracking
          </h2>
          <p className="section-description mt-1 text-xs text-[var(--color-text-muted)]">
            {isConfigure
              ? "Daily minute goals per domain and active days. Confirm in the dialog to update the list, then Save at the top to sync your account."
              : "A streak is a daily time target on one domain — SurfBud tracks whether you hit it on the days you choose."}
          </p>
        </div>

        {isConfigure ? (
          <Button
            size="sm"
            variant="secondary"
            hoverEffect="flat"
            className="productivity-outline-pill shrink-0"
            onClick={() => handleOpenModal()}
          >
            <Plus size={14} />
            New streak
          </Button>
        ) : null}
      </div>

      {actionError ? (
        <div className="error-banner mb-4 text-xs text-[var(--color-danger)]">
          {actionError}
        </div>
      ) : null}

      {isError ? (
        <div className="chart-glass p-6">
          <p className="text-sm text-[var(--color-text-body)]">
            {isConfigure
              ? "Failed to load streaks."
              : "Streak data is currently unavailable."}
          </p>
          {isConfigure ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void refetch()}
              className="mt-4"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isError ? (
        <>
          {isConfigure ? (
            <div className="mt-4 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
              <div
                className={`chart-glass min-w-0 ${STREAK_CONFIGURE_CARD_CLASS}`}
              >
                <div className="mb-4 flex shrink-0 items-center justify-between">
                  <p className="section-label">Your streaks</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {sortedDisplayStreaks.length}{" "}
                    {sortedDisplayStreaks.length === 1 ? "streak" : "streaks"}
                    {dirty ? (
                      <span className="ml-1.5 text-[var(--color-primary)]">
                        · unsaved
                      </span>
                    ) : null}
                  </p>
                </div>

                {sortedDisplayStreaks.length === 0 ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-4 text-center">
                    <p className="text-sm text-[var(--color-text-body)]">
                      No streaks yet.
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Add a domain for a daily time goal — SurfBud tracks
                      progress on the days you pick.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      hoverEffect="flat"
                      className="productivity-outline-pill mt-4"
                      onClick={() => handleOpenModal()}
                    >
                      <Plus size={14} />
                      Create your first streak
                    </Button>
                  </div>
                ) : (
                  <div
                    className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto px-2"
                    onMouseLeave={endHoverPreview}
                  >
                    {sortedDisplayStreaks.map((streak, index) => {
                      const statRow = domainVisualByHostKey.get(
                        browsingDomainHostKey(streak.domain),
                      );
                      return (
                        <CompactStreakRow
                          key={streak._id}
                          streak={streak}
                          rowIndex={index}
                          isConfigure={isConfigure}
                          isDeleting={
                            isConfigure
                              ? false
                              : deletingStreakId === streak._id
                          }
                          isModalOpenRef={isModalOpenRef}
                          onEdit={handleEditStreak}
                          onDelete={handleDelete}
                          onHoverStart={startHoverPreview}
                          onHoverMove={moveHoverPreview}
                          onHoverEnd={endHoverPreview}
                          iconUrl={statRow?.domainLogo?.trim() || undefined}
                          categoryIcon={
                            statRow?.categorySlug
                              ? slugToIcon.get(statRow.categorySlug)
                              : undefined
                          }
                          categoryColor={
                            statRow
                              ? statRow.domainColor?.trim() ||
                                (statRow.categorySlug
                                  ? slugToColor.get(statRow.categorySlug)
                                  : undefined)
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className={`chart-glass min-w-0 ${STREAK_CONFIGURE_CARD_CLASS}`}
              >
                <div className="shrink-0">
                  <p className="section-label">Domains from your browsing</p>
                  <p className="mb-3 mt-1 text-xs text-[var(--color-text-muted)]">
                    Hover a row for details on the main list. Add prefills the
                    new streak form.
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

                <ul className="mt-3 min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto px-2">
                  {isDomainsLoading ? (
                    <>
                      <div className="skeleton h-[42px] w-full rounded-xl" />
                      <div className="skeleton h-[42px] w-full rounded-xl" />
                      <div className="skeleton h-[42px] w-full rounded-xl" />
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
                          isAdded={activeDomainSet.has(
                            browsingDomainHostKey(domain.domain),
                          )}
                          onAdd={(domainName) => handleOpenModal(domainName)}
                        />
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {streaks.length === 0 ? (
                <div className="chart-glass px-6 py-8 text-center">
                  <p className="text-sm text-[var(--color-text-body)]">
                    No streaks yet.
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Streaks haven't been created yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 px-2" onMouseLeave={endHoverPreview}>
                  {sortedDisplayStreaks.map((streak, index) => {
                    const statRow = domainVisualByHostKey.get(
                      browsingDomainHostKey(streak.domain),
                    );
                    return (
                      <CompactStreakRow
                        key={streak._id}
                        streak={streak}
                        rowIndex={index}
                        isConfigure={false}
                        isDeleting={false}
                        isModalOpenRef={isModalOpenRef}
                        onEdit={handleEditStreak}
                        onDelete={handleDelete}
                        onHoverStart={startHoverPreview}
                        onHoverMove={moveHoverPreview}
                        onHoverEnd={endHoverPreview}
                        iconUrl={statRow?.domainLogo?.trim() || undefined}
                        categoryIcon={
                          statRow?.categorySlug
                            ? slugToIcon.get(statRow.categorySlug)
                            : undefined
                        }
                        categoryColor={
                          statRow
                            ? statRow.domainColor?.trim() ||
                              (statRow.categorySlug
                                ? slugToColor.get(statRow.categorySlug)
                                : undefined)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      <StreakModal
        isOpen={isModalOpen}
        isSaving={
          isConfigure
            ? headerBusy
            : createMutation.isPending || updateMutation.isPending
        }
        editingStreak={editingStreak}
        initialDomain={draftDomain}
        changesApplyOnPageSave={isConfigure}
        onClose={handleCloseModal}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {!isModalOpen &&
      hoverPreview &&
      pointer &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[9999] max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-left text-xs shadow-lg"
              style={{
                left: pointer.x + 12,
                top: pointer.y + 12,
              }}
            >
              <p className="font-semibold text-[var(--color-text-heading)]">
                {hoverPreview.label}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                {hoverPreview.domain}
              </p>

              <div className="mt-2 grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1 border-t border-[var(--color-border)] pt-2 text-[11px]">
                <span className="text-[var(--color-text-muted)]">Now</span>
                <span className="font-semibold text-[var(--color-text-body)]">
                  {hoverPreview.currentStreak} day
                  {hoverPreview.currentStreak === 1 ? "" : "s"}
                </span>

                <span className="text-[var(--color-text-muted)]">Goal</span>
                <span className="font-semibold text-[var(--color-text-body)]">
                  {hoverPreview.minMinutes}m/day
                </span>

                <span className="text-[var(--color-text-muted)]">Best</span>
                <span className="font-semibold text-[var(--color-text-body)]">
                  {hoverPreview.longestStreak} day
                  {hoverPreview.longestStreak === 1 ? "" : "s"}
                </span>

                <span className="text-[var(--color-text-muted)]">Today</span>
                <span className="font-semibold text-[var(--color-text-body)]">
                  {formatDurationSeconds(hoverPreview.todaySeconds)}
                </span>

                <span className="text-[var(--color-text-muted)]">Active</span>
                <span className="font-medium text-[var(--color-text-body)]">
                  {activeDaysText(hoverPreview.activeDays)}
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
});

StreakSection.displayName = "StreakSection";
