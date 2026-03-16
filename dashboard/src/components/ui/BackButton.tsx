import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function BackButton({ label, onClick, className }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group inline-flex cursor-pointer items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-primary)]",
        className ?? "",
      ].join(" ")}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
}