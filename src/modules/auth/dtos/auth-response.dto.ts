import type { UserRole } from '../../../common/types';

/** JWT payload shape - used by token service and profile service */
export interface AuthUserPayload {
  sub: string;
  phone?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  role: UserRole;
  domainId?: string | null;
  teamId?: string | null;
  reportingManagerId?: string | null;
}

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
