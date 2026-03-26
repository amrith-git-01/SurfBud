import { useQuery } from "@tanstack/react-query";
import {
  getFilteredSessions,
  type BrowsingDrawerSessionsParams,
} from "./browsing.api";

export function useBrowsingDrawerSessions(
  params: BrowsingDrawerSessionsParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["browsing", "drawer", "sessions", params],
    queryFn: () => getFilteredSessions(params),
    enabled,
    staleTime: 30_000,
  });
}
