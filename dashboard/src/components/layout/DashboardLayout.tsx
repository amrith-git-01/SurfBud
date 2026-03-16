import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ParticleBackground } from "../background/ParticleBackground";
import { Header } from "./Header";
import { Navbar } from "./Navbar";
import { useAuthStore } from "../../stores/auth.store";
import { AuthApiService } from "../../services/auth.service";
import { notifyExtensionAuth } from "../../utils/authBridge";

export function DashboardLayout() {
  const { displayName, clearAuth, accessToken, userId } = useAuthStore();
  const username = displayName ?? "User";

  useEffect(() => {
    if (accessToken && userId && displayName) {
      // Retry a few times to avoid race conditions when content script initializes late.
      const timeouts = [0, 250, 1000].map((delayMs) =>
        window.setTimeout(() => {
          notifyExtensionAuth(accessToken, { userId, displayName });
        }, delayMs),
      );

      return () => {
        timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    return;
  }, [accessToken, userId, displayName]);

  async function handleLogout(): Promise<void> {
    try {
      await AuthApiService.logout();
    } finally {
      clearAuth();
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      {/* Particles sit at z-0 */}
      <ParticleBackground />
      {/* All content relative + z-10 so it sits above particles */}
      <div className="relative z-10">
        <Header username={username} />
        <Navbar onLogout={handleLogout} />
        <main className="pt-[120px] min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
