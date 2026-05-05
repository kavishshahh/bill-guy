"use client";

const ACCESS_TOKEN_KEY = "auth.access_token";
const REFRESH_TOKEN_KEY = "auth.refresh_token";
const USER_KEY = "auth.user";

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: AuthUser;
};

export function saveSession(session: SupabaseSession): void {
  if (typeof window === "undefined") return;
  if (session.access_token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  }
  if (session.refresh_token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }
  if (session.user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
