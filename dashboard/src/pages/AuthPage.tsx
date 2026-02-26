import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginForm, type LoginFormData } from "../components/forms/LoginForm";
import {
  RegisterForm,
  type RegisterFormData,
} from "../components/forms/RegisterForm";
import { AuthApiService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { notifyExtensionAuth } from "../utils/authBridge";

/* ─── Types ──────────────────────────────────────────────────── */
type Tab = "login" | "register";

/* ─── Helpers ────────────────────────────────────────────────── */
function extractErrorMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ??
    "Something went wrong. Please try again."
  );
}

/* ─── Tab switcher component ─────────────────────────────────── */
interface TabSwitcherProps {
  activeTab: Tab;
  onSwitch: (tab: Tab) => void;
}

function TabSwitcher({ activeTab, onSwitch }: TabSwitcherProps) {
  return (
    <div className="flex gap-2 p-1.5 bg-[#F0F9FF] rounded-xl mb-8">
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className={`
          flex-1 py-3 px-4 text-base font-semibold rounded-lg transition-all duration-200
          ${
            activeTab === "login"
              ? "bg-white text-[#0891B2] shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          }
        `}
      >
        Login
      </button>
      <button
        type="button"
        onClick={() => onSwitch("register")}
        className={`
          flex-1 py-3 px-4 text-base font-semibold rounded-lg transition-all duration-200
          ${
            activeTab === "register"
              ? "bg-white text-[#0891B2] shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          }
        `}
      >
        Sign up
      </button>
    </div>
  );
}

/* ─── Auth page ──────────────────────────────────────────────── */
export default function AuthPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setAuth, userId } = useAuthStore();

  const tabFromPath = (): Tab =>
    pathname === "/register" ? "register" : "login";

  const [activeTab, setActiveTab] = useState<Tab>(tabFromPath);

  // Already authenticated — redirect to dashboard
  useEffect(() => {
    if (userId) {
      navigate("/dashboard", { replace: true });
    }
  }, [userId, navigate]);

  if (userId) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="skeleton w-24 h-4 rounded" />
      </div>
    );
  }
  const [animClass, setAnimClass] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with URL
  useEffect(() => {
    const next = tabFromPath();
    if (next === activeTab) return;
    setAnimClass(next === "register" ? "slide-in-right" : "slide-in-left");
    setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function switchTab(to: Tab): void {
    if (to === activeTab) return;
    setAnimClass(to === "register" ? "slide-in-right" : "slide-in-left");
    setActiveTab(to);
    setError(null);
    navigate(`/${to}`);
  }

  async function handleLogin(data: LoginFormData): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await AuthApiService.login(data);
      setAuth({
        accessToken: result.accessToken,
        userId: result.userId,
        displayName: result.displayName,
      });
      notifyExtensionAuth(result.accessToken, {
        userId: result.userId,
        displayName: result.displayName,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(data: RegisterFormData): Promise<void> {
    setError(null);
    setIsLoading(true);
    try {
      const result = await AuthApiService.register({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
      });
      setAuth({
        accessToken: result.accessToken,
        userId: result.userId,
        displayName: data.displayName,
      });
      notifyExtensionAuth(result.accessToken, {
        userId: result.userId,
        displayName: data.displayName,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
        {/* Left column: Welcome (hidden on mobile; mobile shows wordmark above card) */}
        <div className="hidden md:flex flex-col items-center justify-center text-center space-y-8">
          <div className="max-w-md">
            <h1 className="font-display font-bold text-4xl tracking-tight text-[#0F172A]">
              Welcome to <span className="text-[#0891B2]">Surf</span>
              <span className="text-[#0F172A]">Bud</span>
            </h1>
            <p className="mt-3 text-lg font-medium text-[#64748B]">
              Your intelligent web activity tracker
            </p>
          </div>
        </div>

        {/* Right column: Form card */}
        <div className="flex flex-col justify-center">
          {/* Mobile wordmark */}
          <div className="md:hidden text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
              <span className="text-[#0891B2]">Surf</span>
              <span className="text-[#0F172A]">Bud</span>
            </h1>
            <p className="mt-1 text-lg font-medium text-[#64748B]">
              Your intelligent web activity tracker
            </p>
          </div>

          {/* Form card */}
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-8 w-full"
            style={{
              boxShadow:
                "0 8px 32px rgba(8,145,178,0.10), 0 2px 8px rgba(8,145,178,0.06)",
            }}
          >
            <TabSwitcher activeTab={activeTab} onSwitch={switchTab} />

            <div key={activeTab} className={animClass}>
              {activeTab === "login" ? (
                <LoginForm
                  onSubmit={handleLogin}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <RegisterForm
                  onSubmit={handleRegister}
                  isLoading={isLoading}
                  error={error}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
