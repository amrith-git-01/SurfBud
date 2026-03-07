import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

const sizes: Record<Size, string> = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-6 py-3.5 text-[15px]",
  lg: "px-8 py-4 text-base",
};

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={clsx(
        "relative inline-flex items-center justify-center rounded-xl cursor-pointer",
        "focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
    >
      <span
        className={clsx(
          "btn-inner",
          `btn-${variant}`,
          sizes[size],
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
