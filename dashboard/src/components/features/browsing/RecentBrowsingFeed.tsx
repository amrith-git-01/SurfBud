import { useMemo } from "react";
import {
  useBrowsingCategories,
  useBrowsingRecentSessions,
} from "@/api/useBrowsing";
import type { BrowsingSessionRow } from "@/api/browsing.api";
import { RecentFeed, RecentFeedSkeletonRows } from "@/components/ui/RecentFeed";
import { BrowsingCategoryIconBadge } from "@/components/ui/BrowsingCategoryIconBadge";
import { formatDurationSeconds } from "@/utils/formatDuration";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { Globe } from "lucide-react";
import type { BrowsingDrawerTrigger } from "./browsingDrawer.types";

const RECENT_SESSIONS_FEED_LIMIT = 10;

interface RecentBrowsingFeedProps {
  hideHeading?: boolean;
  onOpenDrawer?: (trigger: BrowsingDrawerTrigger) => void;
  onOpenAll?: () => void;
}

export function RecentBrowsingFeed({
  hideHeading = false,
  onOpenDrawer,
  onOpenAll,
}: RecentBrowsingFeedProps) {
  const {
    data: sessions,
    isLoading,
    isError,
    refetch,
  } = useBrowsingRecentSessions(RECENT_SESSIONS_FEED_LIMIT);
  const { data: catalog = [] } = useBrowsingCategories();

  const slugToMeta = useMemo(() => {
    const m = new Map<string, { icon: string; color: string }>();
    for (const c of catalog) {
      m.set(c.slug, { icon: c.icon, color: c.color });
    }
    return m;
  }, [catalog]);

  const rows = (sessions ?? []).slice(0, RECENT_SESSIONS_FEED_LIMIT);

  return (
    <RecentFeed
      hideHeading={hideHeading}
      sectionLabel="RECENT SESSIONS"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      errorMessage="Could not load recent sessions"
      emptyTitle="No recent sessions"
      emptyDescription="Browsing time from the extension will show up here."
      skeleton={<RecentFeedSkeletonRows rowCount={10} />}
      hasItems={rows.length > 0}
      listRoleList
      listContent={rows.map((session) => (
        <SessionRow
          key={session._id}
          session={session}
          categoryMeta={
            session.categorySlug
              ? slugToMeta.get(session.categorySlug)
              : undefined
          }
          onOpenDrawer={onOpenDrawer}
        />
      ))}
      footer={
        <button
          type="button"
          onClick={onOpenAll}
          className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-700)] transition-colors duration-200"
        >
          View all sessions -&gt;
        </button>
      }
    />
  );
}

function sessionDisplayTitle(session: BrowsingSessionRow): string {
  const label = session.label?.trim();
  if (label && label.length > 0) return label;
  const d = session.domain?.trim() || "unknown";
  return d.replace(/^www\./i, "");
}

function SessionRow({
  session,
  categoryMeta,
  onOpenDrawer,
}: {
  session: BrowsingSessionRow;
  categoryMeta?: { icon: string; color: string };
  onOpenDrawer?: (trigger: BrowsingDrawerTrigger) => void;
}) {
  const title = sessionDisplayTitle(session);
  const domain = session.domain?.trim() || "unknown";
  const endedLabel = formatRelativeTime(session.endedAt);
  const durationLabel = formatDurationSeconds(session.durationSeconds);
  const interactive = Boolean(onOpenDrawer);

  return (
    <div
      role="listitem"
      className={`ui-hover-row w-full text-left px-3 py-2.5 border-b border-[var(--color-border)] last:border-b-0 ${interactive ? "cursor-pointer" : ""}`}
      onClick={
        onOpenDrawer
          ? () => onOpenDrawer({ type: "feed-session", session })
          : undefined
      }
      onKeyDown={
        interactive && onOpenDrawer
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDrawer({ type: "feed-session", session });
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div className="self-center" aria-hidden>
          <DomainBadge session={session} categoryMeta={categoryMeta} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] font-medium text-[var(--color-text-strong)] break-words leading-snug"
            title={title}
          >
            {title}
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-[11px] text-[var(--color-text-muted)]">
            <span className="shrink-0 whitespace-nowrap font-mono text-[var(--color-text-secondary)]">
              {durationLabel}
            </span>
            <span className="shrink-0 select-none" aria-hidden>
              &middot;
            </span>
            <span className="min-w-0 shrink break-words">{endedLabel}</span>
            <span className="shrink-0 select-none" aria-hidden>
              &middot;
            </span>
            <span className="min-w-0 break-all font-mono text-[11px] text-[var(--color-text-muted)]">
              {domain}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainBadge({
  session,
  categoryMeta,
}: {
  session: BrowsingSessionRow;
  categoryMeta?: { icon: string; color: string };
}) {
  const logo = session.domainLogo?.trim();
  if (logo) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50"
        aria-hidden
      >
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

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-[var(--color-text-muted)]"
      aria-hidden
    >
      <Globe size={14} strokeWidth={2} />
    </div>
  );
}
