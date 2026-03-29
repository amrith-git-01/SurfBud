import { SkeletonBlock } from "@/components/skeletons/SkeletonBlock";

interface DetailsSkeletonProps {
  rowCount?: number;
}

export function DrawerDetailsSkeleton({ rowCount = 6 }: DetailsSkeletonProps) {
  return (
    <div className="space-y-5">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-lg border border-[var(--color-border)] p-1">
        <SkeletonBlock className="h-7 w-16 rounded-md" />
        <SkeletonBlock className="h-7 w-16 rounded-md" />
      </div>

      <div className="flex flex-col items-center">
        <SkeletonBlock className="h-[72px] w-[72px] rounded-[20px]" />
        <SkeletonBlock className="mt-3 h-6 w-56 rounded" />
        <SkeletonBlock className="mt-2 h-6 w-24 rounded-full" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-3 w-24 rounded" />
          <SkeletonBlock className="h-6 w-24 rounded-full" />
        </div>
        <div className="chart-glass !p-4">
          <div className="space-y-1">
            {Array.from({ length: rowCount }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <SkeletonBlock className="h-3 w-20 rounded" />
                <SkeletonBlock className="h-4 w-48 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineSkeletonProps {
  rowCount?: number;
}

export function DrawerTimelineSkeleton({ rowCount = 4 }: TimelineSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rowCount }).map((_, index) => (
        <div key={index} className="grid grid-cols-[16px_1fr] items-stretch gap-3">
          <div className="relative flex justify-center">
            <span className="absolute top-[9px] bottom-[-12px] left-1/2 w-0.5 -translate-x-1/2 bg-[var(--color-border)]" />
            <span className="relative top-1 h-2.5 w-2.5 rounded-full bg-[var(--color-border)]" />
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5">
            <SkeletonBlock className="h-4 w-40 rounded" />
            <SkeletonBlock className="mt-2 h-3 w-56 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
