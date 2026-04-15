import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "../pages/AuthPage";
import { AuthGuard } from "../components/AuthGuard";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { DownloadsPage } from "../pages/DownloadsPage";
import { ConfigurePage } from "../pages/ConfigurePage";
import { BrowsingPage } from "../pages/BrowsingPage";
import { BrowsingConfigurePage } from "../pages/BrowsingConfigurePage";
import { ProductivityPage } from "../pages/ProductivityPage";
import { ProductivityConfigurePage } from "../pages/ProductivityConfigurePage";
import { SettingsPage } from "../pages/SettingsPage";

export function AppRouter() {
  return (
    <Routes>
      {/* Public — redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth routes */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* Protected routes — DashboardLayout wraps all, Outlet renders page */}
      <Route
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/downloads/configure" element={<ConfigurePage />} />
        <Route path="/browsing" element={<BrowsingPage />} />
        <Route path="/browsing/configure" element={<BrowsingConfigurePage />} />
        <Route path="/productivity" element={<ProductivityPage />} />
        <Route
          path="/productivity/configure"
          element={<ProductivityConfigurePage />}
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
