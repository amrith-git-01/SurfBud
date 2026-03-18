import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Shown on the sliding panel for assistive tech. */
  ariaLabel?: string;
}

/**
 * Downloads-style drawer: portal, backdrop blur, right panel slide, body scroll lock,
 * Escape to close, 280ms exit before unmount. Matches `FileDetailDrawer` shell.
 */
export function DrawerShell({
  isOpen,
  onClose,
  children,
  ariaLabel = "Drawer",
}: DrawerShellProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = window.requestAnimationFrame(() => setIsPanelVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    setIsPanelVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), 280);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [shouldRender, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <aside
        className={[
          "fixed right-0 top-0 h-full w-[640px] max-w-[100vw] sm:max-w-[95vw] bg-white",
          "transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          isPanelVisible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ boxShadow: "-8px 0 32px rgba(8,145,178,0.12)" }}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label={ariaLabel}
      >
        {children}
      </aside>
    </div>,
    document.body,
  );
}
