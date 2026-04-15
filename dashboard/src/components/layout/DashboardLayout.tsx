import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useDownloadsLive } from "@/api/useDownloadsLive";
import { useBrowsingLive } from "@/api/useBrowsingLive";
import { ParticleBackground } from "../background/ParticleBackground";
import { Header } from "./Header";
import { Navbar } from "./Navbar";
import { useAuthStore } from "../../stores/auth.store";
import { AuthApiService } from "../../services/auth.service";
import {
  notifyExtensionAuth,
  notifyExtensionLogout,
} from "../../utils/authBridge";

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      exp?: number;
    };
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function DashboardLayout() {
  const { displayName, clearAuth, accessToken, userId } = useAuthStore();
  const username = displayName ?? "User";
  useDownloadsLive();
  useBrowsingLive();

  useEffect(() => {
    if (!accessToken || !userId || !displayName) return;

    if (isJwtExpired(accessToken)) {
      clearAuth();
      return;
    }

    const timeouts = [0, 250, 1000].map((delayMs) =>
      window.setTimeout(() => {
        notifyExtensionAuth(accessToken, { userId, displayName });
      }, delayMs),
    );

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [accessToken, userId, displayName, clearAuth]);

  useEffect(() => {
    if (!accessToken || !userId || !displayName) return;
    if (isJwtExpired(accessToken)) return;
    const onReady = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (
        (event.data as { type?: string } | null)?.type !==
        "SURFBUD_EXTENSION_READY"
      )
        return;
      notifyExtensionAuth(accessToken, { userId, displayName });
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [accessToken, userId, displayName]);

  async function handleLogout(): Promise<void> {
    try {
      await AuthApiService.logout();
    } finally {
      notifyExtensionLogout();
      clearAuth();
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      {/* Particles sit at z-0 */}
      <ParticleBackground />
      {/* All content relative + z-10 so it sits above particles */}
      <div className="relative z-10">
        <Header username={username} />
        <Navbar onLogout={handleLogout} />
        <main className="min-h-screen bg-[#faf8ff] pt-[120px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
