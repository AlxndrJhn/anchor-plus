import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ unreachable: false, closing: false }));

vi.mock("@/features/auth/store", () => ({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
  clearAccessToken: vi.fn(),
  clearRefreshToken: vi.fn(),
  useAuthStore: {
    getState: () => ({
      unreachable: state.unreachable,
      setUnreachable: (value: boolean) => {
        state.unreachable = value;
      },
    }),
  },
}));

vi.mock("@/lib/page-close", () => ({
  isPageClosing: () => state.closing,
  fitsKeepalive: () => true,
}));

import { api } from "./client";

/** fetch where the API request fails like a dropped connection. */
function stubFetch(health: () => Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/api/health")) return health();
      return Promise.reject(new TypeError("Failed to fetch"));
    }),
  );
}

async function failingRequest() {
  await api
    .extend({ prefix: "http://anchor.test/" })
    .get("api/notes", { retry: 0 })
    .catch(() => undefined);
  // Let the second look at the server settle.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  state.unreachable = false;
  state.closing = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a request that gets no answer", () => {
  it("leaves the app online when the server answers a second look", async () => {
    stubFetch(() => Promise.resolve(new Response("ok")));
    await failingRequest();
    expect(state.unreachable).toBe(false);
  });

  it("takes the app offline when the server doesn't answer either", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    await failingRequest();
    expect(state.unreachable).toBe(true);
  });

  it("leaves the app online when it was cut off by a reload", async () => {
    // The reload cancels the request, and the page hears it is closing
    // before the second look fails too.
    stubFetch(() => {
      state.closing = true;
      return Promise.reject(new TypeError("Failed to fetch"));
    });
    await failingRequest();
    expect(state.unreachable).toBe(false);
  });
});
