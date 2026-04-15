import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  selectUnreadCount,
  useNotificationInboxStore,
  type InboxNotification,
} from "@/stores/notificationInbox.store";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { Bell, CheckCheck, Trash, Trash2, X } from "lucide-react";

type InboxTab = "all" | "unread" | "read";

const TAB_LABELS: { id: InboxTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

function filterByTab(
  items: InboxNotification[],
  tab: InboxTab,
): InboxNotification[] {
  if (tab === "unread") return items.filter((n) => !n.read);
  if (tab === "read") return items.filter((n) => n.read);
  return items;
}

function emptyCopy(tab: InboxTab): string {
  if (tab === "unread") return "No unread notifications.";
  if (tab === "read") return "No read notifications yet.";
  return "No notifications yet.";
}

export function NotificationBell() {
  const items = useNotificationInboxStore((s) => s.items);
  const markRead = useNotificationInboxStore((s) => s.markRead);
  const markAllRead = useNotificationInboxStore((s) => s.markAllRead);
  const dismiss = useNotificationInboxStore((s) => s.dismiss);
  const clearAll = useNotificationInboxStore((s) => s.clearAll);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InboxTab>("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const unread = selectUnreadCount(items);

  const filtered = useMemo(() => filterByTab(items, tab), [items, tab]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleRowActivate = (n: InboxNotification) => {
    markRead(n.id);
    if (n.href) {
      navigate(n.href);
      setOpen(false);
    }
  };

  const handleDeleteAll = () => {
    clearAll();
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[#F1F5F9] hover:text-[var(--color-primary)]"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unread > 0 ? (
          <span className="absolute -right-px -top-px grid h-3 min-h-3 min-w-[12px] place-items-center rounded-full bg-[var(--color-primary)] px-[3px] font-sans text-[8px] font-bold leading-none tabular-nums text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="notification-panel-glass notification-panel-enter absolute right-0 top-[calc(100%+8px)] z-[10070] w-[min(calc(100vw-1.5rem),28rem)] overflow-hidden rounded-2xl shadow-[0_20px_56px_rgba(8,145,178,0.16)]"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-[rgba(8,145,178,0.1)] px-4 py-3">
            <span className="font-display text-base font-semibold text-[var(--color-text-heading)]">
              Notifications
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={unread === 0}
                className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[#F1F5F9] hover:text-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-35"
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={items.length === 0}
                className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[#F1F5F9] hover:text-[var(--color-danger)] disabled:pointer-events-none disabled:opacity-35"
                title="Delete all"
                aria-label="Delete all notifications"
              >
                <Trash className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[#F1F5F9]"
                aria-label="Close"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div
            className="flex gap-0 border-b border-[rgba(8,145,178,0.08)] px-2 pt-1"
            role="tablist"
            aria-label="Filter notifications"
          >
            {TAB_LABELS.map(({ id, label }) => {
              const count =
                id === "all"
                  ? items.length
                  : id === "unread"
                    ? unread
                    : items.length - unread;
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={[
                    "relative flex-1 rounded-t-lg px-2 py-2.5 font-sans text-xs font-medium transition-colors",
                    active
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                  ].join(" ")}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {label}
                    <span
                      className={[
                        "tabular-nums",
                        active
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text-ghost)]",
                      ].join(" ")}
                    >
                      ({count})
                    </span>
                  </span>
                  {active ? (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--color-primary)]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="max-h-[min(70vh,440px)] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-12 text-center font-sans text-sm text-[var(--color-text-muted)]">
                {emptyCopy(tab)}
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(8,145,178,0.08)]">
                {filtered.map((n) => (
                  <li key={n.id}>
                    <div
                      className={`group flex gap-2 px-4 py-3 transition-colors hover:bg-[#F8FAFC] ${
                        n.read ? "opacity-80" : "bg-[#F0FDFA]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleRowActivate(n)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-sans text-sm font-semibold text-[var(--color-text-strong)]">
                          {n.title}
                          {!n.read ? (
                            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] align-middle" />
                          ) : null}
                        </p>
                        <p className="mt-1 line-clamp-2 font-sans text-xs leading-snug text-[var(--color-text-muted)]">
                          {n.body}
                        </p>
                        <p className="mt-1.5 font-sans text-[11px] text-[var(--color-text-ghost)]">
                          {formatRelativeTime(
                            new Date(n.createdAt).toISOString(),
                          )}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => dismiss(n.id)}
                        className="shrink-0 self-start rounded-md p-1.5 text-[var(--color-text-ghost)] opacity-70 transition-opacity hover:bg-[#F1F5F9] hover:text-[var(--color-danger)] group-hover:opacity-100"
                        aria-label="Remove notification"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
