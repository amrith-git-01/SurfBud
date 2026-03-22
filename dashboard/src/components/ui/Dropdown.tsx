import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

import type { DropdownProps, DropdownOption } from "../../types/ui.types";

const DROPDOWN_MENU_Z = 110;
const MENU_GAP_PX = 6;

export function Dropdown<T = string>({
  value,
  options,
  onChange,
  disabled = false,
  className,
  buttonClassName,
  align: _align = "right",
  size = "md",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    centerX: number;
    minWidth: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const close = () => {
    setIsOpen(false);
    setMenuPos(null);
  };

  const handleSelect = (next: DropdownOption<T>) => {
    onChange(next.value);
    close();
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }

    const updatePosition = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + MENU_GAP_PX,
        centerX: rect.left + rect.width / 2,
        minWidth: rect.width,
      });
    };

    updatePosition();
  }, [isOpen]);

  /** Close on scroll / resize (same intent as “click outside” when the page moves). */
  useEffect(() => {
    if (!isOpen) return;

    const onScrollOrResize = () => {
      close();
    };

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("scroll", onScrollOrResize);
      vv.addEventListener("resize", onScrollOrResize);
    }

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      if (vv) {
        vv.removeEventListener("scroll", onScrollOrResize);
        vv.removeEventListener("resize", onScrollOrResize);
      }
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const sizeClasses =
    size === "sm" ? "text-[11px] px-2.5 py-1.5" : "text-xs px-3 py-2";

  const menuContent =
    isOpen && menuPos ? (
      <div
        className="fixed pointer-events-none"
        style={{
          zIndex: DROPDOWN_MENU_Z,
          top: menuPos.top,
          left: menuPos.centerX,
          transform: "translateX(-50%)",
        }}
      >
        <div
          className="anim-pop-in pointer-events-auto min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] py-1"
          style={{
            width: "max-content",
            minWidth: menuPos.minWidth,
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
                "block w-full whitespace-nowrap px-4 py-2 text-left text-xs font-medium transition-colors cursor-pointer font-[var(--font-sans)]",
                opt.value === value
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-hover)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
              close();
            }, 150)
          }
          disabled={disabled}
          className={clsx(
            "inline-flex w-max max-w-full items-center gap-2 font-medium rounded-lg cursor-pointer border border-[var(--color-border)]",
            "hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)] transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1",
            "bg-transparent text-[var(--color-text-body)]",
            disabled &&
              "opacity-50 cursor-not-allowed hover:bg-transparent hover:border-[var(--color-border)]",
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
