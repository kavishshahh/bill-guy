"use client";

/** Sliding “stay logged in” window refreshed on login/token refresh */
const SESSION_SLIDING_MS = 7 * 24 * 60 * 60 * 1000;

const ACCESS_TOKEN_KEY = "auth.access_token";
const REFRESH_TOKEN_KEY = "auth.refresh_token";
const USER_KEY = "auth.user";
const SESSION_UNTIL_KEY = "auth.session_until";

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: AuthUser;
};

/** Login / refresh return flat tokens; signup often nests tokens under session. */
export function normalizeGoTruePayload(data: unknown): SupabaseSession {
  const d = (data ?? {}) as Record<string, unknown>;

  const coerce = (o: Record<string, unknown>): SupabaseSession => ({
    access_token: typeof o.access_token === "string" ? o.access_token : undefined,
    refresh_token: typeof o.refresh_token === "string" ? o.refresh_token : undefined,
    expires_in: typeof o.expires_in === "number" ? o.expires_in : undefined,
    expires_at: typeof o.expires_at === "number" ? o.expires_at : undefined,
    user:
      o.user && typeof o.user === "object" && "id" in (o.user as object)
        ? (o.user as AuthUser)
        : undefined,
  });

  if (typeof d.access_token === "string") {
    return coerce(d);
  }

  const nested = d.session;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const s = coerce(nested as Record<string, unknown>);
    if (s.access_token || s.refresh_token) {
      return s;
    }
  }

  return {};
}

export function decodeJwtExpMs(accessToken: string): number | null {
  try {
    const [, payloadSeg] = accessToken.split(".");
    if (!payloadSeg) return null;

    let b64 = payloadSeg.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (b64.length % 4)) % 4;
    b64 += "=".repeat(padLen);

    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(decoded) as { exp?: number };
    const expSec = typeof payload.exp === "number" ? payload.exp : null;
    if (expSec === null) return null;
    return expSec * 1000;
  } catch {
    return null;
  }
}

/** Save tokens and extend the sliding 7-day offline session window */
export function saveSession(session: unknown): void {
  if (typeof window === "undefined") return;
  const s = normalizeGoTruePayload(session);

  if (s.access_token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, s.access_token);
  }
  if (s.refresh_token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, s.refresh_token);
  }
  if (s.user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(s.user));
  }

  const until = String(Date.now() + SESSION_SLIDING_MS);
  window.localStorage.setItem(SESSION_UNTIL_KEY, until);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(SESSION_UNTIL_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasAuthCredentials(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}

/** True when the sliding 7-day window has elapsed (caller should clearSession + redirect). */
export function isPastAppSessionDeadline(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(SESSION_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() > until;
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
  return (
    typeof window !== "undefined" &&
    !isPastAppSessionDeadline() &&
    hasAuthCredentials()
  );
}

const REFRESH_MARGIN_MS = 120_000;

let refreshInflight: Promise<boolean> | null = null;

/**
 * Obtain new access (+ refresh when rotated) tokens from the backend proxy.
 */
export async function refreshTokensFromServer(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
        cache: "no-store",
      });

      const raw = await res.text();
      let parsed: unknown = {};
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = {};
        }
      }

      if (!res.ok) {
        const msg =
          parsed && typeof parsed === "object" && "error" in parsed
            ? String((parsed as { error: unknown }).error)
            : "";
        if (
          typeof window !== "undefined" &&
          process.env.NODE_ENV === "development" &&
          msg
        ) {
          console.warn("auth.refresh failed:", msg);
        }
        return false;
      }

      saveSession(normalizeGoTruePayload(parsed));
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInflight = null;
  });

  return refreshInflight;
}

/**
 * Proactively refresh shortly before JWT expiry when a refresh_token is present.
 */
export async function ensureAccessTokenFresh(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (isPastAppSessionDeadline()) {
    clearSession();
    return false;
  }

  if (!window.localStorage.getItem(SESSION_UNTIL_KEY) && hasAuthCredentials()) {
    window.localStorage.setItem(SESSION_UNTIL_KEY, String(Date.now() + SESSION_SLIDING_MS));
  }

  const at = getAccessToken();
  const rt = getRefreshToken();
  if (!at && !rt) return false;

  const expMs = at ? decodeJwtExpMs(at) : null;
  const noAccessToken = !at;
  const expiringSoon = expMs !== null && Date.now() >= expMs - REFRESH_MARGIN_MS;

  if (rt && (noAccessToken || expiringSoon)) {
    return refreshTokensFromServer();
  }

  return Boolean(at);
}
