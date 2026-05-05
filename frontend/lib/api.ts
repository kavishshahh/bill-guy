import {
  ensureAccessTokenFresh,
  getAccessToken,
  refreshTokensFromServer,
} from "./auth";

// All requests target relative /api/* paths. The Next.js rewrite in
// next.config.mjs forwards them to the Flask backend so we sidestep CORS
// during development.
const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  authenticated?: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_PREFIX}${path}`, "http://placeholder.local");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // Strip the placeholder origin — fetch is happy with the relative path.
  return url.pathname + (url.search ? url.search : "");
}

function authHeaders(authenticated: boolean): Record<string, string> {
  if (!authenticated) return {};
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, query, authenticated = true } = options;

  if (authenticated) {
    const fresh = await ensureAccessTokenFresh();
    if (!fresh) {
      throw new ApiError(401, "Session expired. Please log in again.", null);
    }
  }

  const url = buildUrl(path, query);
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(authenticated),
  };

  const runFetch = () =>
    fetch(url, {
      method,
      headers: baseHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

  let res = await runFetch();

  if (authenticated && res.status === 401) {
    const renewed = await refreshTokensFromServer();
    if (renewed) {
      baseHeaders.Authorization = `Bearer ${getAccessToken() ?? ""}`;
      res = await fetch(url, {
        method,
        headers: baseHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    }
  }

  const parsed = await parseResponseBody(res);

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : null) || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}
