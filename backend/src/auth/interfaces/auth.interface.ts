export interface AuthPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface TokenResponse {
  access_token: string;
}

export interface OAuthResponse extends TokenResponse {
  onboardingCompleted: boolean;
}
