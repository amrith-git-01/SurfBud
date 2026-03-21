import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDownloadEvents } from "../../../api/useDownloads";
import type { EventsQueryParams } from "../../../api/downloads.api";
import { DrawerListMode } from "@/components/features/downloads/DrawerListMode";
import { DrawerDetailMode } from "@/components/features/downloads/DrawerDetailMode";

export type DrawerMode = "list" | "detail";
export type DrawerDetailView = "details" | "timeline";
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
  initialCanGoBack,
  initialListPreset,
}: FileDetailDrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  const [mode, setMode] = useState<DrawerMode>(initialMode);
  const [canGoBack, setCanGoBack] = useState<boolean>(initialCanGoBack);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialFileId);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [detailView, setDetailView] = useState<DrawerDetailView>(initialDetailView);

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

    setListTitle(initialListPreset.title);
    setSearchInput(initialListPreset.search ?? "");
    setDebouncedSearch(initialListPreset.search ?? "");
    setDateFilter(initialListPreset.date);
    setDomainFilter(initialListPreset.domain);
    setIsRemovedFilter(initialListPreset.isRemoved);
    setExcludeDomainsFilter(initialListPreset.excludeDomains ?? []);
    setPeriod(initialListPreset.period);
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
    initialListPreset,
  ]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = window.requestAnimationFrame(() => setIsPanelVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    setIsPanelVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), 280);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [shouldRender]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, period, status, category, domainFilter, excludeDomainsFilter]);

  useEffect(() => {
    if (!shouldRender) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [shouldRender, onClose]);

  const params: EventsQueryParams = useMemo(() => {
    return {
      page,
      limit: PAGE_SIZE,
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
  } = useDownloadEvents(params, { enabled: shouldRender });

  const total = eventsResponse?.total ?? 0;
  const events = eventsResponse?.events ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const openDetail = (
    fileId: string,
    eventId?: string,
    view: DrawerDetailView = "details",
  ) => {
    setSelectedFileId(fileId);
    setSelectedEventId(eventId ?? null);
    setDetailView(view);
    setCanGoBack(true);
    setMode("detail");
  };

  const backToList = () => {
    setMode("list");
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <aside
        className={[
          "fixed right-0 top-0 h-full w-[640px] max-w-[100vw] sm:max-w-[95vw] bg-white",
          "transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          isPanelVisible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ boxShadow: "-8px 0 32px rgba(8,145,178,0.12)" }}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="File details drawer"
      >
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
              period={period}
              onPeriodChange={setPeriod}
              status={status}
              onStatusChange={setStatus}
              category={category}
              onCategoryChange={setCategory}
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
              initialView={detailView}
              isActive={mode === "detail"}
              canGoBack={canGoBack}
              listTitle={listTitle}
              onBack={backToList}
              onClose={onClose}
            />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}