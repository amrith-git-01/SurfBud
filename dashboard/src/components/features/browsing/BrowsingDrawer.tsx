import {
  useBrowsingCategories,
  useBrowsingDomainStats,
  useBrowsingStats,
} from "@/api/useBrowsing";
import { useBrowsingDrawerSessions } from "@/api/useBrowsingDrawer";
import type {
  BrowsingDrawerSessionsParams,
  BrowsingSessionRow as BrowsingSession,
} from "@/api/browsing.api";
import { DrawerListLayout } from "@/components/ui/DrawerListLayout";
import { DrawerShell } from "@/components/ui/DrawerShell";
import { DrawerListCardsSkeleton } from "@/components/skeletons/DrawerListCardsSkeleton";
import { BrowsingDomainRow } from "./BrowsingDomainRow";
import { BrowsingSessionDetail } from "./BrowsingSessionDetail";
import { BrowsingSessionRow } from "./BrowsingSessionRow";
import { FocusScoreSummaryHeader } from "./FocusScoreSummaryHeader";
import type { BrowsingDrawerTrigger } from "./browsingDrawer.types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const LIMIT = 10;

const STUB_SESSION_QUERY: BrowsingDrawerSessionsParams = {
  page: 1,
  limit: LIMIT,
  sort: "newest",
};

const EMPTY: Record<string, { primary: string; secondary?: string }> = {
  "time-online": {
    primary: "No sessions recorded today yet.",
    secondary: "Browse with the extension to see activity here.",
  },
  "all-sessions": {
    primary: "No sessions recorded yet.",
    secondary: "Browse with the extension to see activity here.",
  },
  "sites-visited": {
    primary: "No sites visited today yet.",
  },
  "top-site": {
    primary: "No sessions for this site today.",
  },
  "focus-score": {
    primary: "No productive sessions today yet.",
  },
  "longest-session": {
    primary: "No sessions recorded today yet.",
  },
  "chart-bar": {
    primary: "No sessions recorded on this day.",
  },
  "site-breakdown": {
    primary: "No sessions for this site in the selected period.",
  },
  "site-breakdown-others": {
    primary: "No sessions for other sites in the selected period.",
  },
  "category-breakdown": {
    primary: "No sessions in this category for the selected period.",
  },
  "timeline-block": {
    primary: "No sessions in this time window.",
  },
};

/** Fixed per-drawer sort (no client-side sort UI). */
function fixedSortForTrigger(
  trigger: BrowsingDrawerTrigger,
): "newest" | "oldest" | "longest" {
  switch (trigger.type) {
    case "focus-score":
      return "longest";
    case "longest-session":
      return "longest";
    case "category-breakdown":
      return "longest";
    case "timeline-block":
      return "newest";
    default:
      return "newest";
  }
}

function buildSessionQuery(
  trigger: BrowsingDrawerTrigger,
  page: number,
  apiSort: "newest" | "oldest" | "longest",
): BrowsingDrawerSessionsParams | null {
  const base = { page, limit: LIMIT, sort: apiSort };
  switch (trigger.type) {
    case "time-online":
      return { ...base, period: "today", sort: apiSort };
    case "all-sessions":
      return { ...base, period: "all", sort: "newest" };
    case "top-site": {
      if (!trigger.domain.trim()) return null;
      return {
        ...base,
        period: "today",
        domain: trigger.domain,
        sort: apiSort,
      };
    }
    case "focus-score":
      return {
        ...base,
        period: "today",
        productivityType: "productive",
        sort: apiSort,
      };
    case "longest-session":
      return { ...base, period: "today", sort: apiSort };
    case "chart-bar":
      return { ...base, date: trigger.date, sort: apiSort };
    case "site-breakdown":
      return {
        ...base,
        period: trigger.period,
        domain: trigger.domain,
        sort: apiSort,
      };
    case "site-breakdown-others":
      return {
        ...base,
        period: trigger.period,
        excludeDomains: trigger.excludedDomains,
        sort: "newest",
      };
    case "category-breakdown":
      return {
        ...base,
        period: trigger.period,
        categorySlug: trigger.categorySlug,
        sort: apiSort,
      };
    case "timeline-block":
      return {
        ...base,
        from: trigger.startIso,
        to: trigger.endIso,
        sort: "newest",
      };
    default:
      return null;
  }
}

function drawerTitle(trigger: BrowsingDrawerTrigger): string {
  switch (trigger.type) {
    case "time-online":
      return "Today's Sessions";
    case "all-sessions":
      return "All Sessions";
    case "sites-visited":
      return "Sites Visited Today";
    case "top-site":
      return `Sessions on ${trigger.label}`;
    case "focus-score":
      return "Productive Sessions";
    case "longest-session":
      return "All Sessions by Duration";
    case "chart-bar":
      return `${trigger.formattedDate} Sessions`;
    case "feed-session":
      return "Session Detail";
    case "site-breakdown":
      return `Sessions on ${trigger.label}`;
    case "site-breakdown-others":
      return "Sessions on Other Sites";
    case "category-breakdown":
      return `${trigger.categoryName} Sessions`;
    case "timeline-block":
      return `${trigger.timeLabel} Sessions`;
    default:
      return "Sessions";
  }
}

interface BrowsingDrawerProps {
  isOpen: boolean;
  trigger: BrowsingDrawerTrigger | null;
  onClose: () => void;
}

export function BrowsingDrawer({
  isOpen,
  trigger,
  onClose,
}: BrowsingDrawerProps) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: catalog = [] } = useBrowsingCategories();
  const { data: metrics } = useBrowsingStats();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listAnimSeed, setListAnimSeed] = useState(0);
  const [selectedSessionFromList, setSelectedSessionFromList] =
    useState<BrowsingSession | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!trigger) return;
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setSelectedSessionFromList(null);
  }, [trigger]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedSessionFromList(null);
    }
  }, [isOpen]);

  const slugToMeta = useMemo(() => {
    const m = new Map<string, { icon: string; color: string; name: string }>();
    for (const c of catalog) {
      m.set(c.slug, { icon: c.icon, color: c.color, name: c.name });
    }
    return m;
  }, [catalog]);

  const sessionListEnabled =
    !!trigger &&
    trigger.type !== "feed-session" &&
    trigger.type !== "sites-visited";

  const apiSort = useMemo(
    () => (trigger ? fixedSortForTrigger(trigger) : "newest"),
    [trigger],
  );

  const sessionQuery = useMemo(() => {
    if (!trigger) return null;
    if (
      trigger.type === "feed-session" ||
      trigger.type === "sites-visited"
    ) {
      return null;
    }
    return buildSessionQuery(trigger, page, apiSort);
  }, [trigger, page, apiSort]);

  const { data: sessionPage, isLoading, isError, refetch } =
    useBrowsingDrawerSessions(
      sessionQuery ?? STUB_SESSION_QUERY,
      Boolean(sessionQuery) && sessionListEnabled && isOpen,
    );

  const { data: domainPayload, isLoading: domainsLoading } =
    useBrowsingDomainStats(
      { period: "today" },
      { enabled: trigger?.type === "sites-visited" && isOpen },
    );

  const filteredSessions = useMemo(() => {
    const rows = sessionPage?.sessions ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.domain.toLowerCase().includes(q) ||
        (s.label ?? "").toLowerCase().includes(q),
    );
  }, [sessionPage?.sessions, debouncedSearch]);

  const domainRows = useMemo(() => {
    const rows = domainPayload?.domains ?? [];
    const q = debouncedSearch.trim().toLowerCase();
    let list = q
      ? rows.filter(
          (r) =>
            r.domain.toLowerCase().includes(q) ||
            r.label.toLowerCase().includes(q),
        )
      : rows;
    list = [...list].sort((a, b) => b.totalActiveTime - a.totalActiveTime);
    return list;
  }, [domainPayload?.domains, debouncedSearch]);

  useEffect(() => {
    if (!isOpen || !!selectedSessionFromList) return;

    if (trigger?.type === "sites-visited") {
      if (!domainsLoading) {
        setListAnimSeed((seed) => seed + 1);
      }
      return;
    }

    if (sessionListEnabled && !isLoading && !isError) {
      setListAnimSeed((seed) => seed + 1);
    }
  }, [
    isOpen,
    trigger?.type,
    domainsLoading,
    sessionListEnabled,
    isLoading,
    isError,
    page,
    debouncedSearch,
    selectedSessionFromList,
  ]);

  if (!trigger) return null;

  if (trigger.type === "feed-session") {
    const slug = trigger.session.categorySlug?.trim();
    const meta = slug ? slugToMeta.get(slug) : undefined;
    return (
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Browsing session detail"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <BrowsingSessionDetail
            session={trigger.session}
            categoryName={meta?.name ?? null}
            categoryIcon={meta?.icon}
            categoryColor={meta?.color}
            timeZone={timeZone}
            onClose={onClose}
          />
        </div>
      </DrawerShell>
    );
  }

  if (selectedSessionFromList) {
    const detailSession = selectedSessionFromList;
    const slug = detailSession.categorySlug?.trim();
    const meta = slug ? slugToMeta.get(slug) : undefined;
    return (
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Browsing session detail"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <BrowsingSessionDetail
            session={detailSession}
            categoryName={meta?.name ?? null}
            categoryIcon={meta?.icon}
            categoryColor={meta?.color}
            timeZone={timeZone}
            onBack={() => setSelectedSessionFromList(null)}
            onClose={onClose}
          />
        </div>
      </DrawerShell>
    );
  }

  const emptyCopy = EMPTY[trigger.type] ?? {
    primary: "No sessions recorded yet.",
  };

  const showFocusHeader =
    trigger.type === "focus-score" && metrics?.today != null;

  const timelineAccessory =
    trigger.type === "timeline-block" ? (
      <p className="flex items-center gap-2 text-xs text-[#64748B]">
        <span>
          {(sessionPage?.total ?? 0) === 1
            ? "1 session"
            : `${sessionPage?.total ?? 0} sessions`}
        </span>
        <span aria-hidden>·</span>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            trigger.productivity === "productive"
              ? "bg-[#16A34A]"
              : trigger.productivity === "distractive"
                ? "bg-[#DC2626]"
                : "bg-[#94A3B8]"
          }`}
        />
        <span className="capitalize">{trigger.productivity}</span>
      </p>
    ) : null;

  const sessionSubtitle =
    trigger.type === "timeline-block"
      ? undefined
      : sessionPage != null
        ? `${sessionPage.total} session${sessionPage.total === 1 ? "" : "s"} found`
        : undefined;

  const paginationFooter =
    sessionPage &&
    sessionPage.totalPages > 1 &&
    !debouncedSearch.trim() ? (
      <footer className="sticky bottom-0 border-t border-[var(--color-border)] bg-white px-6 py-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
            className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-bg-page)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Page {page} of {sessionPage.totalPages}
          </p>
          <button
            type="button"
            disabled={page >= sessionPage.totalPages}
            onClick={() =>
              setPage((p) =>
                sessionPage.totalPages
                  ? Math.min(sessionPage.totalPages, p + 1)
                  : p + 1,
              )
            }
            aria-label="Next page"
            className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-bg-page)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    ) : null;

  if (trigger.type === "sites-visited") {
    const domainSubtitle = domainPayload
      ? `${domainRows.length} site${domainRows.length === 1 ? "" : "s"}`
      : undefined;

    return (
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="Sites visited today"
      >
        <DrawerListLayout
          title={drawerTitle(trigger)}
          subtitle={domainSubtitle}
          onClose={onClose}
          searchInput={search}
          onSearchInputChange={setSearch}
          searchPlaceholder="Search domains…"
          listClassName={
            !domainsLoading && domainRows.length === 0
              ? "flex items-center justify-center"
              : undefined
          }
        >
          {domainsLoading ? (
            <DrawerListCardsSkeleton
              rowCount={10}
              iconSizeClass="h-10 w-10"
              trailingVariant="value"
            />
          ) : domainRows.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm font-medium text-[var(--color-text-body)]">
                {emptyCopy.primary}
              </p>
              {emptyCopy.secondary ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {emptyCopy.secondary}
                </p>
              ) : null}
            </div>
          ) : (
            domainRows.map((row, index) => {
              const meta = slugToMeta.get(row.categorySlug);
              return (
                <div
                  key={`${listAnimSeed}-${row._id}`}
                  className="anim-list-item-enter ui-hover-row mb-3 w-full rounded-xl border border-[var(--color-border)] bg-white text-left transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                  style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
                >
                  <div className="px-6 py-3">
                    <BrowsingDomainRow
                      row={row}
                      categoryIcon={meta?.icon}
                      categoryColor={meta?.color}
                      noPadding
                    />
                  </div>
                </div>
              );
            })
          )}
        </DrawerListLayout>
      </DrawerShell>
    );
  }

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Browsing sessions drawer"
    >
      <DrawerListLayout
        title={drawerTitle(trigger)}
        subtitle={sessionSubtitle}
        titleAccessory={timelineAccessory}
        onClose={onClose}
        searchInput={search}
        onSearchInputChange={setSearch}
        searchPlaceholder="Search sessions…"
        footer={paginationFooter}
        listClassName={
          !isLoading && !isError && filteredSessions.length === 0
            ? "flex items-center justify-center"
            : undefined
        }
      >
        {showFocusHeader && metrics?.today ? (
          <div className="mb-3">
            <FocusScoreSummaryHeader
              productiveSeconds={metrics.today.productiveTime}
              distractingSeconds={metrics.today.distractingTime}
              focusScore={metrics.today.focusScore}
            />
          </div>
        ) : null}

        {isLoading ? (
          <DrawerListCardsSkeleton
            rowCount={10}
            iconSizeClass="h-10 w-10"
            trailingVariant="value"
          />
        ) : null}

        {!isLoading && isError ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-[var(--color-danger)]">
              Could not load sessions.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && filteredSessions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-medium text-[var(--color-text-body)]">
              {emptyCopy.primary}
            </p>
            {emptyCopy.secondary ? (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {emptyCopy.secondary}
              </p>
            ) : null}
          </div>
        ) : null}

        {!isLoading &&
          !isError &&
          filteredSessions.map((s, index) => {
            const slug = s.categorySlug?.trim();
            const meta = slug ? slugToMeta.get(slug) : undefined;
            return (
              <div
                key={`${listAnimSeed}-${s._id}`}
                className="anim-list-item-enter ui-hover-row mb-3 w-full rounded-xl border border-[var(--color-border)] bg-white text-left transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                style={{ animationDelay: `${Math.min(index, 9) * 30}ms` }}
              >
                <div className="px-6 py-3">
                  <BrowsingSessionRow
                    session={s}
                    categoryIcon={meta?.icon}
                    categoryColor={meta?.color}
                    timeZone={timeZone}
                      onClick={() =>
                        setSelectedSessionFromList(s)
                      }
                    noPadding
                  />
                </div>
              </div>
            );
          })}
      </DrawerListLayout>
    </DrawerShell>
  );
}
