import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { userId } = useAuthStore();

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
