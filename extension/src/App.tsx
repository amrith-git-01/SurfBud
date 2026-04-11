import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppRouter } from "@/router/AppRouter";
import { useExtensionAuth } from "@/hooks/useExtensionAuth";
import { useExtensionDownloadsLive } from "@/hooks/useExtensionDownloadsLive";
import { WelcomeView } from "@/sidepanel/WelcomeView";
import { WaitingForAuthView } from "@/sidepanel/WaitingForAuthView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ExtensionDownloadsLiveBridge() {
  useExtensionDownloadsLive();
  return null;
}

export default function App() {
  const { auth } = useExtensionAuth();
  const [loginFlowStarted, setLoginFlowStarted] = useState(false);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      setLoginFlowStarted(false);
    }
  }, [auth?.isAuthenticated]);

  const screen = useMemo(() => {
    if (auth === null) {
      return "loading" as const;
    }
    if (auth.isAuthenticated) {
      return "home" as const;
    }
    if (loginFlowStarted) {
      return "waiting" as const;
    }
    return "welcome" as const;
  }, [auth, loginFlowStarted]);

  const handleOpenedLoginTab = useCallback(() => {
    setLoginFlowStarted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ExtensionDownloadsLiveBridge />
      <div className="flex min-h-[100dvh] w-full min-w-0 flex-col">
        {screen === "loading" || auth === null ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[var(--color-bg-page)] px-4">
            <p className="text-xs text-[var(--color-text-muted)]">Loading…</p>
          </div>
        ) : null}

        {screen === "home" && auth ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-bg-page)]">
            <MemoryRouter>
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
                <AppRouter displayName={auth.displayName} />
              </div>
            </MemoryRouter>
          </div>
        ) : null}

        {screen === "waiting" ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-bg-page)]">
            <div className="flex min-h-0 flex-1 flex-col">
              <WaitingForAuthView />
            </div>
          </div>
        ) : null}

        {screen === "welcome" ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-bg-page)]">
            <div className="flex min-h-0 flex-1 flex-col">
              <WelcomeView onOpenedLoginTab={handleOpenedLoginTab} />
            </div>
          </div>
        ) : null}
      </div>
    </QueryClientProvider>
  );
}
