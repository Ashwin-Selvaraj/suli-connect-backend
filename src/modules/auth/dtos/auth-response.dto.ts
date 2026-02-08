import type { UserRole } from '../../../common/types';
import type { AuthUserResponse } from '../services/auth-user-response.service';

export type { AuthUserResponse };

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
