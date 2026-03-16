export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
}

export interface LoginBody {
  email: string;
  password: string;
  timezone?: string;
}
