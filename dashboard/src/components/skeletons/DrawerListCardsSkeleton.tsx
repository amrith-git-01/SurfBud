import { SkeletonBlock } from "@/components/skeletons/SkeletonBlock";

interface DrawerListCardsSkeletonProps {
  rowCount?: number;
  iconSizeClass?: string;
  trailingVariant?: "none" | "badge" | "value" | "badgeWithChevron";
  showTrailingSlot?: boolean;
}

export function DrawerListCardsSkeleton({
  rowCount = 10,
  iconSizeClass = "h-10 w-10",
  trailingVariant = "none",
  showTrailingSlot = false,
}: DrawerListCardsSkeletonProps) {
  const resolvedTrailing =
    trailingVariant === "none" && showTrailingSlot ? "badge" : trailingVariant;

  return (
    <div>
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className="mb-3 rounded-xl border border-[var(--color-border)] bg-white px-6 py-3"
        >
          <div className="flex items-center gap-3">
            <SkeletonBlock className={`${iconSizeClass} rounded-xl`} />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="mb-2 h-4 w-44 rounded" />
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-3 w-24 rounded" />
                <SkeletonBlock className="h-3 w-2 rounded-full" />
                <SkeletonBlock className="h-3 w-20 rounded" />
              </div>
            </div>
            {resolvedTrailing === "badge" ? (
              <SkeletonBlock className="h-5 w-14 rounded-md" />
            ) : null}
            {resolvedTrailing === "value" ? (
              <SkeletonBlock className="h-4 w-16 rounded" />
            ) : null}
            {resolvedTrailing === "badgeWithChevron" ? (
              <div className="ml-3 flex items-center gap-2">
                <SkeletonBlock className="h-5 w-14 rounded-md" />
                <SkeletonBlock className="h-4 w-4 rounded" />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
