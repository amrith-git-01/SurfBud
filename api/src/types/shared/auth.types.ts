export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}
export interface JwtPayload {
  sub: string;
  email: string;
  timezone?: string;
  iat?: number;
  exp?: number;
}
export interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
}
export interface LoginBody {
  email: string;
  password: string;
  timezone?: string;
}
