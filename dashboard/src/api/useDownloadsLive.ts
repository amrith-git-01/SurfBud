import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSSE } from "@/hooks/useSSE";
import { downloadKeys } from "@/api/useDownloads";
import type { UserDownloadMetrics } from "@/api/downloads.api";
import { useNotificationInboxStore } from "@/stores/notificationInbox.store";
import type {
  DownloadNewPayload,
  DownloadUpdatedPayload,
  MetricsDeltaPayload,
} from "@/types/shared/websocket.types";

export function useDownloadsLive() {
  const queryClient = useQueryClient();
  const { source, isConnected } = useSSE();
  const { pathname } = useLocation();
  const addNotification = useNotificationInboxStore((s) => s.add);

  useEffect(() => {
    if (!source || !isConnected) return;

    const onDownloadsSection = pathname.startsWith("/downloads");

    const handleDownloadNew = (e: MessageEvent) => {
      const data = JSON.parse(e.data as string) as DownloadNewPayload;
      queryClient.invalidateQueries({ queryKey: downloadKeys.stats() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.recent() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.categoriesAll() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.domainsAll() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.duplicates() });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "downloads" &&
          query.queryKey[1] === "trend",
      });

      if (!onDownloadsSection) {
        addNotification({
          kind: "download",
          title:
            data.status === "duplicate" ? "Duplicate download" : "New download",
          body: data.filename,
          href: "/downloads",
        });
      }
    };

    const handleDownloadUpdated = (e: MessageEvent) => {
      const data = JSON.parse(e.data as string) as DownloadUpdatedPayload;
      queryClient.invalidateQueries({ queryKey: downloadKeys.recent() });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "downloads" &&
          query.queryKey[1] === "events",
      });
      if (data.removed) {
        queryClient.invalidateQueries({ queryKey: downloadKeys.duplicates() });
        queryClient.invalidateQueries({ queryKey: downloadKeys.stats() });
        queryClient.invalidateQueries({
          queryKey: downloadKeys.categoriesAll(),
        });
        queryClient.invalidateQueries({ queryKey: downloadKeys.domainsAll() });
        addNotification({
          kind: "file_remove",
          title: "File removed from disk",
          body: data.filename?.trim() || "Duplicate copy removed",
          href: "/downloads",
        });
      }
    };

    const handleMetricsDelta = (e: MessageEvent) => {
      const data = JSON.parse(e.data as string) as MetricsDeltaPayload;
      queryClient.setQueryData(
        downloadKeys.stats(),
        (old: UserDownloadMetrics | null | undefined) => {
          if (!old) return old;
          return { ...old, ...data };
        },
      );
    };

    source.addEventListener("dashboard:download:new", handleDownloadNew);
    source.addEventListener(
      "dashboard:download:updated",
      handleDownloadUpdated,
    );
    source.addEventListener("dashboard:metrics:delta", handleMetricsDelta);

    return () => {
      source.removeEventListener("dashboard:download:new", handleDownloadNew);
      source.removeEventListener(
        "dashboard:download:updated",
        handleDownloadUpdated,
      );
      source.removeEventListener("dashboard:metrics:delta", handleMetricsDelta);
    };
  }, [source, isConnected, queryClient, pathname, addNotification]);
}
