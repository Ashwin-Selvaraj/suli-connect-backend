/** Auth config - use env vars in production */
export const authConfig = {
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'suli-access-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'suli-refresh-secret-change-in-prod',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/webapp/auth/google/callback',
    frontendRedirectUri: process.env.FRONTEND_REDIRECT_URI || 'http://localhost:5173',
  },
  otp: {
    expiryMinutes: 5,
    length: 6,
  },
  nonce: {
    expiryMinutes: 5,
  },
  cookie: {
    refreshTokenName: 'refresh_token',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
};
