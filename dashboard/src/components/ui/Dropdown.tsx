import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

import type { DropdownProps, DropdownOption } from "../../types/ui.types";

const DROPDOWN_MENU_Z = 110;

export function Dropdown<T = string>({
  value,
  options,
  onChange,
  disabled = false,
  className,
  buttonClassName,
  align = "right",
  size = "md",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const handleSelect = (next: DropdownOption<T>) => {
    onChange(next.value);
    setIsOpen(false);
    setMenuRect(null);
  };

  const getMenuRect = (): {
    top: number;
    left: number;
    width: number;
  } | null => {
    const btn = buttonRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return {
      top: rect.bottom + 6,
      left: align === "right" ? rect.right - rect.width : rect.left,
      width: rect.width,
    };
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const rect = getMenuRect();
      if (rect) setMenuRect(rect);
    } else {
      setMenuRect(null);
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) setMenuRect(null);
  }, [isOpen]);

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2.5 py-1.5"
      : "text-xs px-3 py-2";

  const menuContent =
    isOpen && menuRect ? (
      <div
        className="anim-pop-in fixed rounded-lg border py-1 bg-[var(--color-bg-card)] border-[var(--color-border)]"
        style={{
          zIndex: DROPDOWN_MENU_Z,
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
          minWidth: menuRect.width,
          boxShadow:
            "0 8px 25px rgba(8,145,178,0.10), 0 4px 10px rgba(8,145,178,0.07)",
        }}
      >
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(opt);
            }}
            className={clsx(
              "w-full text-left px-4 py-2 text-xs font-medium transition-colors cursor-pointer font-[var(--font-sans)]",
              opt.value === value
                ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-hover)]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <div className={clsx("relative inline-block", className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          onBlur={() =>
            setTimeout(() => {
              setIsOpen(false);
              setMenuRect(null);
            }, 150)
          }
          disabled={disabled}
          className={clsx(
            "flex items-center gap-2 font-medium rounded-lg cursor-pointer border border-[var(--color-border)]",
            "hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)] transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1",
            "bg-transparent text-[var(--color-text-body)]",
            disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:border-[var(--color-border)]",
            sizeClasses,
            buttonClassName,
          )}
        >
          <span>{selected?.label}</span>
          <div
            className={clsx("dropdown-arrow", isOpen && "dropdown-arrow--open")}
          >
            <ChevronDown
              className="w-3.5 h-3.5 text-[var(--color-text-muted)]"
              aria-hidden
            />
          </div>
        </button>
      </div>
      {menuContent && createPortal(menuContent, document.body)}
    </>
  );
}
