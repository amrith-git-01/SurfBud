import { useEffect, useMemo, useState } from "react";
import { useDownloadEvents } from "../../../api/useDownloads";
import type { EventsQueryParams } from "../../../api/downloads.api";
import { DrawerShell } from "@/components/ui/DrawerShell";
import { DrawerListMode } from "@/components/features/downloads/DrawerListMode";
import { DrawerDetailMode } from "@/components/features/downloads/DrawerDetailMode";

export type DrawerMode = "list" | "detail";
export type DrawerDetailView = "details" | "timeline";
export type DrawerEventSelectionMode = "newest" | "original";
export type DrawerPeriod = "today" | "week" | "month" | "all";
export type DrawerStatusFilter = "all" | "new" | "duplicate";
export type DrawerCategoryFilter =
  | "all"
  | "document"
  | "image"
  | "text"
  | "code"
  | "executable"
  | "archive"
  | "audio"
  | "video"
  | "other";

export interface DrawerListPreset {
  title: string;
  period: DrawerPeriod;
  sort?: "newest" | "oldest";
  status?: DrawerStatusFilter;
  isRemoved?: boolean;
  category?: DrawerCategoryFilter;
  domain?: string;
  excludeDomains?: string[];
  search?: string;
  date?: string;
}

interface FileDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: DrawerMode;
  initialFileId: string | null;
  initialEventId: string | null;
  initialDetailView: DrawerDetailView;
  initialEventSelectionMode?: DrawerEventSelectionMode;
  initialCanGoBack: boolean;
  initialListPreset: DrawerListPreset;
}

const PAGE_SIZE = 10;

export function FileDetailDrawer({
  isOpen,
  onClose,
  initialMode,
  initialFileId,
  initialEventId,
  initialDetailView,
  initialEventSelectionMode = "newest",
  initialCanGoBack,
  initialListPreset,
}: FileDetailDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>(initialMode);
  const [canGoBack, setCanGoBack] = useState<boolean>(initialCanGoBack);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialFileId);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [detailView, setDetailView] = useState<DrawerDetailView>(initialDetailView);
  const [eventSelectionMode, setEventSelectionMode] = useState<DrawerEventSelectionMode>(
    initialEventSelectionMode,
  );

  const [listTitle, setListTitle] = useState(initialListPreset.title);
  const [searchInput, setSearchInput] = useState(initialListPreset.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(initialListPreset.search ?? "");
  const [dateFilter, setDateFilter] = useState(initialListPreset.date);
  const [domainFilter, setDomainFilter] = useState(initialListPreset.domain);
  const [isRemovedFilter, setIsRemovedFilter] = useState(initialListPreset.isRemoved);
  const [excludeDomainsFilter, setExcludeDomainsFilter] = useState<string[]>(
    initialListPreset.excludeDomains ?? [],
  );
  const [period, setPeriod] = useState<DrawerPeriod>(initialListPreset.period);
  const [sort, setSort] = useState<"newest" | "oldest">(
    initialListPreset.sort ?? "newest",
  );
  const [status, setStatus] = useState<DrawerStatusFilter>(
    initialListPreset.status ?? "all",
  );
  const [category, setCategory] = useState<DrawerCategoryFilter>(
    initialListPreset.category ?? "all",
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    setMode(initialMode);
    setCanGoBack(initialCanGoBack);
    setSelectedFileId(initialFileId);
    setSelectedEventId(initialEventId);
    setDetailView(initialDetailView);
    setEventSelectionMode(initialEventSelectionMode);

    setListTitle(initialListPreset.title);
    setSearchInput(initialListPreset.search ?? "");
    setDebouncedSearch(initialListPreset.search ?? "");
    setDateFilter(initialListPreset.date);
    setDomainFilter(initialListPreset.domain);
    setIsRemovedFilter(initialListPreset.isRemoved);
    setExcludeDomainsFilter(initialListPreset.excludeDomains ?? []);
    setPeriod(initialListPreset.period);
    setSort(initialListPreset.sort ?? "newest");
    setStatus(initialListPreset.status ?? "all");
    setCategory(initialListPreset.category ?? "all");
    setPage(1);
  }, [
    isOpen,
    initialMode,
    initialCanGoBack,
    initialFileId,
    initialEventId,
    initialDetailView,
    initialEventSelectionMode,
    initialListPreset,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, period, status, category, domainFilter, excludeDomainsFilter]);

  const params: EventsQueryParams = useMemo(() => {
    return {
      page,
      limit: PAGE_SIZE,
      sort,
      period,
      date: dateFilter,
      domain: domainFilter,
      isRemoved: isRemovedFilter,
      excludeDomains:
        excludeDomainsFilter.length > 0 ? excludeDomainsFilter : undefined,
      search: debouncedSearch || undefined,
      status: status === "all" ? undefined : status,
      category: category === "all" ? undefined : category,
    };
  }, [
    page,
    sort,
    period,
    dateFilter,
    domainFilter,
    isRemovedFilter,
    excludeDomainsFilter,
    debouncedSearch,
    status,
    category,
  ]);

  const {
    data: eventsResponse,
    isLoading: isEventsLoading,
    isError: isEventsError,
    refetch: refetchEvents,
  } = useDownloadEvents(params, { enabled: isOpen });

  const total = eventsResponse?.total ?? 0;
  const events = eventsResponse?.events ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openDetail = (
    fileId: string,
    eventId?: string,
    view: DrawerDetailView = "details",
  ) => {
    setSelectedFileId(fileId);
    setSelectedEventId(eventId ?? null);
    setEventSelectionMode("newest");
    setDetailView(view);
    setCanGoBack(true);
    setMode("detail");
  };

  const backToList = () => {
    setMode("list");
  };

  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} ariaLabel="File details drawer">
      <div className="relative h-full overflow-hidden">
        <div
          className={[
            "absolute inset-0 transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
            mode === "list"
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "-translate-x-full opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <DrawerListMode
            title={listTitle}
            total={total}
            events={events}
            isLoading={isEventsLoading}
            isError={isEventsError}
            onRetry={() => void refetchEvents()}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            page={page}
            totalPages={totalPages}
            onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            onSelectFile={(fileId, eventId) => openDetail(fileId, eventId, "details")}
            onClose={onClose}
          />
        </div>

        <div
          className={[
            "absolute inset-0 transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
            mode === "detail"
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "translate-x-full opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <DrawerDetailMode
            fileId={selectedFileId}
            eventId={selectedEventId}
            eventSelectionMode={eventSelectionMode}
            initialView={detailView}
            isActive={mode === "detail"}
            canGoBack={canGoBack}
            listTitle={listTitle}
            onBack={backToList}
            onClose={onClose}
          />
        </div>
      </div>
    </DrawerShell>
  );
}