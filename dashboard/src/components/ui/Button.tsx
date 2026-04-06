import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";
type HoverEffect = "lift" | "flat";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  hoverEffect?: HoverEffect;
  className?: string;
}

const sizes: Record<Size, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
  lg: "px-6 py-2.5 text-[15px]",
};

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  hoverEffect = "lift",
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={clsx(
        "relative inline-flex items-center justify-center rounded-lg cursor-pointer",
        "focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        hoverEffect === "flat" && "btn-hover-flat",
        className,
      )}
    >
      <span
        className={clsx(
          "btn-inner",
          `btn-${variant}`,
          sizes[size],
          "border-2 border-transparent box-border",
          isLoading && "opacity-80",
        )}
      >
        {isLoading ? <Spinner /> : children}
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
    />
  );
}
