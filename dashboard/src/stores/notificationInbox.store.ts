import { create } from "zustand";

export type InboxNotificationKind = "download" | "file_remove" | "system";

export interface InboxNotification {
  id: string;
  kind: InboxNotificationKind;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  href?: string;
}

const MAX_ITEMS = 40;

interface InboxState {
  items: InboxNotification[];
  add: (input: Omit<InboxNotification, "id" | "createdAt" | "read"> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearRead: () => void;
  clearAll: () => void;
}

export const useNotificationInboxStore = create<InboxState>((set) => ({
  items: [],

  add: (input) => {
    const id = input.id ?? crypto.randomUUID();
    const row: InboxNotification = {
      id,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      createdAt: Date.now(),
      read: false,
    };
    set((s) => ({ items: [row, ...s.items].slice(0, MAX_ITEMS) }));
  },

  markRead: (id) => {
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  markAllRead: () => {
    set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) }));
  },

  dismiss: (id) => {
    set((s) => ({ items: s.items.filter((n) => n.id !== id) }));
  },

  clearRead: () => {
    set((s) => ({ items: s.items.filter((n) => !n.read) }));
  },

  clearAll: () => {
    set({ items: [] });
  },
}));

export function selectUnreadCount(items: InboxNotification[]): number {
  return items.filter((n) => !n.read).length;
}
