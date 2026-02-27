import { api } from "./api";
import type { LoginBody, RegisterBody } from "../types/shared/auth.types";

interface LoginResult {
  accessToken: string;
  userId: string;
  displayName: string;
}

interface RegisterResult {
  accessToken: string;
  userId: string;
  displayName: string;
}

export const AuthApiService = {
  async login(body: LoginBody): Promise<LoginResult> {
    const res = await api.post<{ data: LoginResult }>("/api/auth/login", body);
    return res.data.data;
  },
  async register(body: RegisterBody): Promise<RegisterResult> {
    const res = await api.post<{ data: RegisterResult }>(
      "/api/auth/register",
      body,
    );
    return res.data.data;
  },
  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },
  async getMe(): Promise<{ userId: string; email: string }> {
    const res = await api.get<{ data: { userId: string; email: string } }>(
      "/api/auth/me",
    );
    return res.data.data;
  },
};
