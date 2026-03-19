import clsx from "clsx";

interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div aria-hidden className={clsx("skeleton", className)} />;
}
