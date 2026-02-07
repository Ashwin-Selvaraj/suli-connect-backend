import * as tokenService from '../services/token.service';
import * as sessionService from '../services/session.service';

/** Verify refresh token and validate against stored session */
export async function validateRefreshToken(
  refreshToken: string
): Promise<{ userId: string; sessionId: string } | null> {
  return sessionService.validateRefreshToken(refreshToken);
}
