import { create } from "zustand";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

const DEFAULT_DURATION_MS = 4200;
const MAX_TOASTS = 5;

interface ToastState {
  toasts: ToastItem[];
  push: (input: Omit<ToastItem, "id"> & { id?: string; durationMs?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (input) => {
    const { durationMs = DEFAULT_DURATION_MS, id: inputId, tone, title, description } = input;
    const id = inputId ?? crypto.randomUUID();
    const item: ToastItem = { id, tone, title, description };

    set((s) => ({
      toasts: [...s.toasts, item].slice(-MAX_TOASTS),
    }));

    if (durationMs > 0) {
      window.setTimeout(() => {
        get().dismiss(id);
      }, durationMs);
    }

    return id;
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
