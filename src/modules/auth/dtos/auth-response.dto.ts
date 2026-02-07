/**
 * Strict auth response format for all successful auth endpoints.
 */
export interface AuthResponse {
  token: {
    accessToken: string;
    refreshToken: string;
  };
  user: AuthUserResponse;
}

export interface AuthUserResponse {
  id: string;
  phone?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  name: string;
  avatarUrl?: string | null;
  role: string;
  domainId?: string | null;
  teamId?: string | null;
  reportingManagerId?: string | null;
  reputationScore?: number;
}
