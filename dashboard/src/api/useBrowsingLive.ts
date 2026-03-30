import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSSE } from "@/hooks/useSSE";
import { browsingKeys } from "@/api/useBrowsing";

export function useBrowsingLive() {
  const queryClient = useQueryClient();
  const { source, isConnected } = useSSE();

  useEffect(() => {
    if (!source || !isConnected) return;

    const handleSynced = () => {
      queryClient.invalidateQueries({ queryKey: browsingKeys.stats() });
      queryClient.invalidateQueries({ queryKey: browsingKeys.all });
    };

    source.addEventListener("dashboard:browsing:synced", handleSynced);

    return () => {
      source.removeEventListener("dashboard:browsing:synced", handleSynced);
    };
  }, [source, isConnected, queryClient]);
}
