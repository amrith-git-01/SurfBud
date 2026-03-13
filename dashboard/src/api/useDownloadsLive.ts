import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { downloadKeys } from '@/api/useDownloads';
import type {
  DownloadNewPayload,
  DownloadUpdatedPayload,
  MetricsDeltaPayload,
} from '@/types/shared/websocket.types';

/**
 * Enable live updates for Downloads page via WebSocket.
 * Call this hook from DownloadsPage to auto-refresh data when downloads occur.
 */
export function useDownloadsLive() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Event 1: New download completed
    const handleDownloadNew = (data: DownloadNewPayload) => {
      console.log('[Downloads Live] New download:', data);

      // Invalidate all affected queries
      // React Query will auto-refetch in background
      queryClient.invalidateQueries({ queryKey: downloadKeys.stats() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.recent() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.categories() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.domains() });
      queryClient.invalidateQueries({ queryKey: downloadKeys.duplicates() });

      // Also invalidate trend for all periods
      queryClient.invalidateQueries({
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'downloads' &&
            query.queryKey[1] === 'trend'
          );
        },
      });
    };

    // Event 2: Download updated (removed flag changed)
    const handleDownloadUpdated = (data: DownloadUpdatedPayload) => {
      console.log('[Downloads Live] Download updated:', data);

      // Invalidate recent feed and any event lists
      queryClient.invalidateQueries({ queryKey: downloadKeys.recent() });
      queryClient.invalidateQueries({
        predicate: (query) => {
          return (
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'downloads' &&
            query.queryKey[1] === 'events'
          );
        },
      });
    };

    // Event 3: Metrics delta (optional optimization — direct cache update)
    const handleMetricsDelta = (data: MetricsDeltaPayload) => {
      console.log('[Downloads Live] Metrics delta:', data);

      // Directly update stats cache without refetch
      queryClient.setQueryData(downloadKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          ...data,
        };
      });
    };

    // Register event listeners
    socket.on('dashboard:download:new', handleDownloadNew);
    socket.on('dashboard:download:updated', handleDownloadUpdated);
    socket.on('dashboard:metrics:delta', handleMetricsDelta);

    // Cleanup on unmount
    return () => {
      socket.off('dashboard:download:new', handleDownloadNew);
      socket.off('dashboard:download:updated', handleDownloadUpdated);
      socket.off('dashboard:metrics:delta', handleMetricsDelta);
    };
  }, [socket, isConnected, queryClient]);
}