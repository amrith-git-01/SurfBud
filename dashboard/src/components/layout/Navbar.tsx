import { Link, useLocation } from "react-router-dom";

interface NavbarProps {
  onLogout?: () => void;
}

const navItems = [
  { id: "dashboard" as const, path: "/dashboard", label: "Dashboard" },
  { id: "downloads" as const, path: "/downloads", label: "Downloads" },
  { id: "browsing" as const, path: "/browsing", label: "Browsing" },
  { id: "reports" as const, path: "/reports", label: "Reports" },
  { id: "settings" as const, path: "/settings", label: "Settings" },
];

export function Navbar({ onLogout }: NavbarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed top-16 inset-x-0 z-40 h-14 header-glass">
      <div className="max-w-[1400px] mx-auto px-8 h-full flex items-center justify-between">
        {/* Left side — nav links */}
        <div className="flex items-center gap-1 -ml-4">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.id}
                to={item.path}
                replace
                className={`
                  group relative px-4 py-2 font-sans text-sm font-medium
                  transition-colors duration-200 ease-out
                  ${isActive
                    ? "text-[#0891B2]"
                    : "text-[#64748B] hover:text-[#0891B2]"
                  }
                `}
              >
                {item.label}
                {/* Animated underline - expands from center (width-based, no scale) */}
                <span className="absolute bottom-1 left-4 right-4 h-0.5 flex justify-center">
                  <span
                    className={`
                      block h-full mx-auto bg-[#0891B2] rounded-full
                      transition-[width] duration-250 ease-out
                      ${isActive
                        ? "w-full"
                        : "w-0 group-hover:w-full"
                      }
                    `}
                  />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right side — logout */}
        <button
          onClick={onLogout}
          className="group relative px-4 py-2 font-sans text-sm font-medium text-[#64748B] hover:text-[#dc2626] transition-colors duration-200 ease-out cursor-pointer -mr-4"
        >
          Logout
          {/* Animated underline - red, expands from center (width-based, no scale) */}
          <span className="absolute bottom-1 left-4 right-4 h-0.5 flex justify-center">
            <span
              className="block h-full mx-auto bg-[#dc2626] rounded-full
                         transition-[width] duration-250 ease-out
                         w-0 group-hover:w-full"
            />
          </span>
        </button>
      </div>
    </nav>
  );
}
