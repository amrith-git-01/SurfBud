import { UserRound } from "lucide-react";

interface HeaderProps {
  username: string;
}

export function Header({ username }: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 header-glass">
      <div className="max-w-[1400px] mx-auto px-8 h-full flex items-center justify-between">
        {/* Wordmark */}
        <div>
          <span className="font-display font-bold text-xl text-[#0891B2]">Surf</span>
          <span className="font-display font-bold text-xl text-[#0F172A]">Bud</span>
        </div>

        {/* Right side — greeting + avatar */}
        <div className="flex items-center gap-3">
          <span className="font-sans text-base font-medium text-[#334155]">
            Hey, {username}
          </span>
          <div className="avatar-btn">
            <UserRound className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
        </div>
      </div>
    </header>
  );
}
