/**
 * Public routes - skip JWT auth.
 * Format: { method, path } where path is matched with startsWith.
 */

export interface PublicRoute {
  method: string;
  path: string;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  // Auth: sign-in, OAuth, OTP, wallet, login, refresh
  { method: 'GET', path: '/api/auth/webapp/auth' },
  { method: 'GET', path: '/api/auth/webapp/auth/google/callback' },
  { method: 'POST', path: '/api/auth/sign-in' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/otp/request' },
  { method: 'POST', path: '/api/auth/otp/verify' },
  { method: 'POST', path: '/api/auth/wallet/request' },
  { method: 'POST', path: '/api/auth/wallet/verify' },
  { method: 'POST', path: '/api/auth/google' },
  { method: 'POST', path: '/api/auth/refresh' },
  { method: 'POST', path: '/api/auth/logout' },
];

export function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some((r) => r.method === method && path.startsWith(r.path));
}
