import { useId, useState } from "react";
import clsx from "clsx";

interface TextFieldProps {
  label: string;
  showLabel?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  error?: string;
  helperText?: string;
  className?: string;
  containerClassName?: string;
  autoComplete?: string;
  required?: boolean;
}

export function TextField({
  label,
  showLabel = true,
  placeholder,
  type = "text",
  value,
  onChange,
  onClear,
  error,
  helperText,
  className,
  containerClassName,
  autoComplete,
  required,
}: TextFieldProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);

  const resolvedType = type === "password" && showPassword ? "text" : type;
  const showClearIcon = Boolean(onClear && value.length > 0);
  const showPasswordToggle = type === "password";
  const showRightIcon = showPasswordToggle || showClearIcon;

  return (
    <div className={clsx("space-y-2", containerClassName)}>
      {showLabel ? (
        <label
          htmlFor={id}
          className="block text-base font-normal tracking-tight text-[var(--color-text-heading)]"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(
            "w-full px-4 py-3 text-base border-2 rounded-xl transition-all duration-200",
            "placeholder:text-gray-400",
            "focus:outline-none focus:shadow-none focus-visible:shadow-none",
            error
              ? "border-red-300 bg-red-50/30 focus:border-red-500"
              : "border-[#CBD5E1] bg-white focus:border-[#0891B2]",
            showRightIcon && "pr-10",
            className,
          )}
        />

        {showRightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {showPasswordToggle ? (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="inline-flex items-center justify-center text-gray-400 hover:text-[#0891B2] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-1 rounded-md"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeIcon className="w-5 h-5" />
                ) : (
                  <EyeOffIcon className="w-5 h-5" />
                )}
              </button>
            ) : showClearIcon && onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 rounded-md"
                aria-label="Clear field"
                tabIndex={-1}
              >
                <ClearIcon className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500">
          {error}
        </p>
      )}
      {helperText !== undefined && error === undefined && (
        <p className="text-sm text-[var(--color-text-muted)]">{helperText}</p>
      )}
    </div>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
