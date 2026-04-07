import { useToastStore } from "@/stores/toast.store";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const toneIcon = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
} as const;

const toneAccent: Record<string, string> = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-primary)",
  warning: "var(--color-warning)",
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[10060] flex w-[min(100vw-2rem,22rem)] flex-col-reverse gap-2"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((t) => {
        const Icon = toneIcon[t.tone];
        const accent = toneAccent[t.tone] ?? "var(--color-primary)";
        return (
          <div
            key={t.id}
            className="toast-glass pointer-events-auto animate-[toastIn_280ms_cubic-bezier(0.175,0.885,0.32,1.05)_forwards]"
            role="status"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-white shadow-[0_1px_4px_rgba(15,23,42,0.06)]"
              style={{ color: accent }}
              aria-hidden
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-semibold leading-snug text-[var(--color-text-heading)]">
                {t.title}
              </p>
              {t.description ? (
                <p className="mt-0.5 font-sans text-xs leading-relaxed text-[var(--color-text-muted)]">
                  {t.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[#F1F5F9] hover:text-[var(--color-text-strong)]"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
