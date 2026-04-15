import type { ReactNode } from "react";

interface ConfigureSectionSkeletonProps {
  title: string;
  description: string;
  children: ReactNode;
  cardClassName?: string;
}

export function ConfigureSectionSkeleton({
  title,
  description,
  children,
  cardClassName,
}: ConfigureSectionSkeletonProps) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      <div
        className={["card-metric-glass mt-4 p-5", cardClassName ?? ""]
          .join(" ")
          .trim()}
      >
        {children}
      </div>
    </section>
  );
}
