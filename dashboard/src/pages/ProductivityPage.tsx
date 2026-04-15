import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ProductivityPage() {
  const navigate = useNavigate();

  return (
    <div className="productivity-configure-shell min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="section-title-display text-3xl font-bold tracking-tight text-[var(--color-text-heading)] md:text-4xl">
              Productivity
            </h1>
            <p className="section-description mt-2 max-w-xl text-sm text-[var(--color-text-muted)] md:text-[13px]">
              This page summarizes what the extension is doing: tab groups, streaks, and focus. Open Configure to change behavior.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            hoverEffect="flat"
            className="productivity-outline-pill shrink-0"
            onClick={() => navigate("/productivity/configure")}
          >
            <Settings className="h-3.5 w-3.5" />
            Configure
          </Button>
        </header>
      </div>
    </div>
  );
}
