import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Navbar } from "./Navbar";
import { useAuthStore } from "../../stores/auth.store";
import { AuthApiService } from "../../services/auth.service";
import { notifyExtensionAuth, notifyExtensionLogout } from "../../utils/authBridge";

export function DashboardLayout() {
  const { displayName, clearAuth, accessToken, userId } = useAuthStore();
  const username = displayName ?? "User";

  useEffect(() => {
    if (accessToken && userId && displayName) {
      notifyExtensionAuth(accessToken, { userId, displayName });
    }
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
    <div className="min-h-screen bg-[#F0F9FF]">
      <Header username={username} />
      <Navbar onLogout={handleLogout} />
      <main className="pt-[120px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
