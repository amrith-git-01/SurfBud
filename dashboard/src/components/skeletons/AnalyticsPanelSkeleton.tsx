import { SkeletonBlock } from "@/components/skeletons/SkeletonBlock";

interface AnalyticsPanelSkeletonProps {
  hideHeading?: boolean;
  sectionTitle: string;
  sectionDescription: string;
  className?: string;
}

export function AnalyticsPanelSkeleton({
  hideHeading = false,
  sectionTitle,
  sectionDescription,
  className,
}: AnalyticsPanelSkeletonProps) {
  return (
    <section className={className ?? (hideHeading ? "" : "mb-12")}>
      {!hideHeading && (
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold text-gray-900">{sectionTitle}</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{sectionDescription}</p>
        </div>
      )}

      <div className="chart-glass flex h-[420px] w-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-8 w-32 rounded-md" />
          <SkeletonBlock className="h-8 w-36 rounded-md" />
        </div>

        <div className="custom-scrollbar h-[300px] min-h-[300px] space-y-4 overflow-y-hidden pr-2">
          <div className="rounded-lg py-1">
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <SkeletonBlock className="h-3 w-14 rounded" />
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-3 w-20 rounded" />
                <SkeletonBlock className="h-3 w-16 rounded" />
              </div>
            </div>
            <SkeletonBlock className="h-2 w-full rounded-full" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg py-1">
              <div className="mb-1.5 flex items-center justify-between gap-4">
                <SkeletonBlock className="h-3 w-28 rounded" />
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-3 w-16 rounded" />
                  <SkeletonBlock className="h-3 w-14 rounded" />
                </div>
              </div>
              <SkeletonBlock className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
