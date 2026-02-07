import { authConfig } from '../config';

export interface GoogleProfile {
  id: string;
  email: string | null;
  name: string;
  picture: string | null;
}

/** Exchange authorization code for access token */
export async function exchangeCodeForTokens(code: string): Promise<{ access_token: string }> {
  const params = new URLSearchParams({
    code,
    client_id: authConfig.google.clientId,
    client_secret: authConfig.google.clientSecret,
    redirect_uri: authConfig.google.redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }
  const json = await res.json() as { access_token: string };
  return json;
}

/** Fetch Google user profile */
export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google profile fetch failed: ${err}`);
  }
  const data = await res.json() as { id: string; email?: string; name?: string; picture?: string };
  return {
    id: data.id,
    email: data.email || null,
    name: data.name || 'User',
    picture: data.picture || null,
  };
}

/** Build OAuth authorization URL for redirect flow */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: authConfig.google.clientId,
    redirect_uri: authConfig.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
