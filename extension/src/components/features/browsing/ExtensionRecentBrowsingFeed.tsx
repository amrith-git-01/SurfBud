import { useMemo } from "react";
import type { BrowsingSessionRow } from "@/api/browsing.api";
import {
  useBrowsingCategoryCatalog,
  useBrowsingRecentSessions,
} from "@/api/useBrowsing";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import {
  RecentFeed,
  RecentFeedSkeletonRows,
} from "@/components/ui/RecentFeed";
import { getDashboardUrl } from "@/lib/dashboard-url";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { ChevronRight, Globe } from "lucide-react";

function openDashboardBrowsing(): void {
  if (typeof chrome === "undefined" || !chrome.tabs?.create) {
    return;
  }
  chrome.tabs.create({ url: getDashboardUrl("/browsing") });
}

function sessionDisplayTitle(session: BrowsingSessionRow): string {
  const label = session.label?.trim();
  if (label && label.length > 0) return label;
  const d = session.domain?.trim() || "unknown";
  return d.replace(/^www\./i, "");
}

export function ExtensionRecentBrowsingFeed() {
  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
  } = useBrowsingRecentSessions();
  const { data: catalog = [] } = useBrowsingCategoryCatalog();

  const slugToMeta = useMemo(() => {
    const m = new Map<string, { icon: string; color: string }>();
    for (const c of catalog) {
      m.set(c.slug, { icon: c.icon, color: c.color });
    }
    return m;
  }, [catalog]);

  const rows = sessions ?? [];

  return (
    <RecentFeed
      sectionTitle="Recent sessions"
      sectionDescription="Recent browsing sessions synced from this Chrome profile."
      headingId="ext-recent-browsing-heading"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      errorMessage="Could not load recent sessions"
      emptyTitle="No recent sessions"
      emptyDescription="When SurfBud records browsing time from this extension, sessions will appear in this list."
      skeleton={<RecentFeedSkeletonRows trailingSlot rowCount={8} />}
      hasItems={rows.length > 0}
      listRoleList
      listContent={rows.map((session) => (
        <SessionFeedRow
          key={session._id}
          session={session}
          categoryMeta={
            session.categorySlug
              ? slugToMeta.get(session.categorySlug)
              : undefined
          }
        />
      ))}
      footer={
        <button
          type="button"
          onClick={openDashboardBrowsing}
          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] transition-colors duration-200 hover:text-[var(--color-primary-600)]"
        >
          <span>View all in dashboard</span>
          <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      }
    />
  );
}

function SessionFeedRow({
  session,
  categoryMeta,
}: {
  session: BrowsingSessionRow;
  categoryMeta?: { icon: string; color: string };
}) {
  const title = sessionDisplayTitle(session);
  const domain = session.domain?.trim() || "unknown";
  const endedLabel = formatRelativeTime(session.endedAt);
  const durationLabel = formatDurationSeconds(session.durationSeconds);

  return (
    <div
      role="listitem"
      className="ui-hover-row flex w-full items-start gap-2.5 border-b border-[var(--color-border)] px-3 py-3 last:border-b-0"
    >
      <div className="shrink-0 self-center" aria-hidden>
        <SessionBadge session={session} categoryMeta={categoryMeta} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-snug text-[var(--color-text-strong)]">
          {title}
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[10px] text-[var(--color-text-muted)]">
          <span className="shrink-0 whitespace-nowrap tabular-nums">
            {durationLabel}
          </span>
          <span className="shrink-0" aria-hidden>
            ·
          </span>
          <span className="min-w-0 shrink-0 whitespace-nowrap">{endedLabel}</span>
          <span className="shrink-0" aria-hidden>
            ·
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[var(--color-text-secondary)]">
            {domain}
          </span>
        </div>
      </div>

      <ChevronRight
        size={13}
        className="ml-1 shrink-0 self-center text-[var(--color-text-muted)]"
        aria-hidden
      />
    </div>
  );
}

function SessionBadge({
  session,
  categoryMeta,
}: {
  session: BrowsingSessionRow;
  categoryMeta?: { icon: string; color: string };
}) {
  const logo = session.domainLogo?.trim();
  if (logo) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        <img
          src={logo}
          alt=""
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (categoryMeta) {
    return (
      <BrowsingCategoryIconBadge
        iconName={categoryMeta.icon}
        color={categoryMeta.color}
        size="md"
      />
    );
  }

  const p = session.productivityType;
  const fallback =
    p === "productive"
      ? { bg: "#DCFCE7", fg: "#16A34A" }
      : p === "distractive"
        ? { bg: "#FEE2E2", fg: "#DC2626" }
        : { bg: "#F1F5F9", fg: "#64748B" };

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: fallback.bg, color: fallback.fg }}
    >
      <Globe size={12} strokeWidth={2} />
    </div>
  );
}
