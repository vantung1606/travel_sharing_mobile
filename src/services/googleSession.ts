import { authApi, type UserAuthData } from './api';

export function getGoogleToken(url: string): string {
  try {
    const parsed = new URL(url, 'wayfare://oauth');
    const hash = new URLSearchParams(parsed.hash.slice(1));
    return hash.get('id_token') || parsed.searchParams.get('id_token')
      || hash.get('access_token') || parsed.searchParams.get('access_token') || '';
  } catch {
    return '';
  }
}

let current: { token: string; result: Promise<UserAuthData> } | null = null;

/** Native auth-session completion and the callback route can receive the same URL. */
export function completeGoogleSignIn(token: string): Promise<UserAuthData> {
  if (current?.token === token) return current.result;
  const result = authApi.loginWithGoogle(token);
  current = { token, result };
  result.catch(() => { if (current?.result === result) current = null; });
  result.finally(() => {
    setTimeout(() => { if (current?.result === result) current = null; }, 30000);
  }).catch(() => {});
  return result;
}
