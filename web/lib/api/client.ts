import ky, { HTTPError, type Options } from "ky";
import {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  useAuthStore,
} from "@/features/auth/store";
import type { RefreshTokenResponse } from "@/features/auth/types";
import { isServerless } from "@/lib/local-backend/mode";
import { fitsKeepalive, isPageClosing } from "@/lib/page-close";
import { translatedError } from "./error-code";

let refreshPromise: Promise<boolean> | null = null;

class RefreshRefused extends Error {}

// Use fetch directly to avoid interceptor loops
async function requestNewTokens(): Promise<RefreshTokenResponse> {
  const storedRefreshToken = getRefreshToken();

  if (!storedRefreshToken) {
    throw new RefreshRefused("No refresh token available");
  }

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefreshToken }),
  });

  if (!response.ok) {
    if (response.status >= 500) throw new Error("Server unavailable");
    throw new RefreshRefused("Failed to refresh token");
  }

  return response.json();
}

function endSession(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
}

/** The admin's deadline for a passkey or authenticator app has passed. */
function notifySecondFactor(response: Response): void {
  void response
    .clone()
    .json()
    .then((body: { error?: string }) => {
      if (body?.error === "second_factor_required")
        window.dispatchEvent(new CustomEvent("auth:second-factor"));
    })
    .catch(() => {});
}

function signOut(): void {
  clearAccessToken();
  clearRefreshToken();
  endSession();
}

async function runRefresh(): Promise<boolean> {
  try {
    const tokens = await requestNewTokens();
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    return true;
  } catch (error) {
    // Only a refused token signs out; an unreachable server keeps you in.
    if (error instanceof RefreshRefused) signOut();
    return false;
  } finally {
    refreshPromise = null;
  }
}

export function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= runRefresh();
  return refreshPromise;
}

// A read the server hasn't answered after this long: it counts as offline,
// and the app works from what the device holds until the server is back.
const SLOW_READ_MS = 5000;
const RECHECK_MS = 5000;

let recheckTimer: ReturnType<typeof setTimeout> | undefined;
// Requests on their way, cut off together once the server stops answering.
const waiting = new Set<AbortController>();

function reached() {
  clearTimeout(recheckTimer);
  recheckTimer = undefined;
  if (useAuthStore.getState().unreachable)
    useAuthStore.getState().setUnreachable(false);
}

/** The server didn't answer: offline until it does, asked every few seconds. */
function notReached() {
  if (!useAuthStore.getState().unreachable) {
    useAuthStore.getState().setUnreachable(true);
    // They would only hold "Saving…" up until they gave up; they fail now
    // and wait for the server like everything else.
    for (const controller of waiting) controller.abort();
    waiting.clear();
  }
  if (recheckTimer !== undefined) return;
  const recheck = () => {
    recheckTimer = setTimeout(() => {
      globalThis
        .fetch("/api/health", { signal: AbortSignal.timeout(RECHECK_MS) })
        .then((response) => {
          if (response.ok) reached();
          else recheck();
        }, recheck);
    }, RECHECK_MS);
  };
  recheck();
}

function fetchNoticingServer(input: RequestInfo | URL, init?: RequestInit) {
  const method = (
    init?.method ?? (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  // Only reads: an upload can take long to send before the server answers.
  const slow =
    method === "GET" ? setTimeout(notReached, SLOW_READ_MS) : undefined;
  const controller = new AbortController();
  waiting.add(controller);
  const own = init?.signal ?? (input instanceof Request ? input.signal : null);
  const signal = own
    ? AbortSignal.any([own, controller.signal])
    : controller.signal;
  return globalThis.fetch(input, { ...init, signal }).then(
    (response) => {
      clearTimeout(slow);
      waiting.delete(controller);
      reached();
      return response;
    },
    (error: unknown) => {
      clearTimeout(slow);
      waiting.delete(controller);
      // Cut off on purpose (left the page, or a timeout) says nothing new.
      if (!(error instanceof DOMException && error.name === "AbortError"))
        notReached();
      throw error;
    },
  );
}

export const api = ky.create({
  prefix: "/",
  // Looked up on each request: the serverless builds answer it themselves.
  fetch: (input, init) =>
    isServerless
      ? globalThis.fetch(input, init)
      : fetchNoticingServer(input, init),
  timeout: 30000,
  hooks: {
    beforeRequest: [
      ({ request, options }) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
        // keepalive: the page is closing.
        if (isPageClosing() && fitsKeepalive(options.body))
          return new Request(request, { keepalive: true });
      },
    ],
    beforeError: [
      ({ error }) => {
        // Show the server's own message when it sends one, translated when
        // its code is one this app knows.
        if (error instanceof HTTPError) {
          const { message } = (error.data ?? {}) as {
            message?: string | string[];
          };
          const translated = translatedError(error);
          if (translated) error.message = translated;
          else if (message) {
            error.message = Array.isArray(message)
              ? message.join(", ")
              : message;
          }
        }
        return error;
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (response.status === 403) notifySecondFactor(response);
        if (response.status !== 401 || retryCount > 0) {
          return response;
        }

        // A failed sign-in, or a session that ended in another tab.
        if (!request.headers.has("Authorization")) {
          endSession();
          return response;
        }

        if (!(await refreshAccessToken())) {
          return response;
        }

        const headers = new Headers(request.headers);
        headers.set("Authorization", `Bearer ${getAccessToken()}`);
        return ky.retry({
          request: new Request(request, { headers }),
          delay: 0,
        });
      },
    ],
  },
});

/** Reads the body without ky's timeout. */
export async function getJson<T>(url: string, options?: Options): Promise<T> {
  const response = await api.get(url, options);
  return response.json<T>();
}
