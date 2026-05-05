import { getAccessToken } from "./auth";

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

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, query, authenticated = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authenticated) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Best-effort body parse; surface raw text on parse failure so the caller
  // gets something useful rather than "unexpected end of JSON input".
  let parsed: unknown = null;
  const raw = await res.text();
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : null) || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}
