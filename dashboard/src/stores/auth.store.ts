import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  setAuth: (data: {
    accessToken: string;
    userId: string;
    displayName: string;
  }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      displayName: null,
      isAuthenticated: false,
      setAuth: ({ accessToken, userId, displayName }) =>
        set({ accessToken, userId, displayName, isAuthenticated: true }),
      clearAuth: () =>
        set({
          accessToken: null,
          userId: null,
          displayName: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "surfbud-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        userId: state.userId,
        displayName: state.displayName,
      }),
    },
  ),
);
