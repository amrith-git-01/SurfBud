import { useCallback } from "react";
import { useToastStore, type ToastTone } from "@/stores/toast.store";

export function useToast() {
  const push = useToastStore((s) => s.push);
  const dismiss = useToastStore((s) => s.dismiss);

  const toast = useCallback(
    (tone: ToastTone, title: string, description?: string, durationMs?: number) =>
      push({ tone, title, description, durationMs }),
    [push],
  );

  return {
    success: (title: string, description?: string) => toast("success", title, description),
    error: (title: string, description?: string) =>
      toast("error", title, description, 7000),
    info: (title: string, description?: string) => toast("info", title, description),
    warning: (title: string, description?: string) => toast("warning", title, description, 5500),
    dismiss,
    raw: push,
  };
}
