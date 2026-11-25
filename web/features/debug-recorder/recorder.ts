import type { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { appMode } from "@/lib/local-backend/mode";
import { createFrameEncoder, type FrameEncoder } from "./encode";
import {
  describeKey,
  describeQueryKey,
  describeValue,
  keepShape,
  Pseudonyms,
  scrubError,
  scrubUrl,
  truncate,
} from "./privacy";
import { renderWireframe } from "./render";
import type { DebugEvent, DebugRecording } from "./report";

export const MAX_DURATION_MS = 30_000;
/** Frames are drawn at most this often; slower on a busy page. */
const MIN_FRAME_GAP_MS = 40; // 25 fps, as on Android
const LONG_SIDE = 1280;
const MAX_EVENTS = 5000;

/** The recorder's own controls carry this, and aren't filmed. */
export const RECORDER_ATTRIBUTE = "data-debug-recorder";
/**
 * Where the pointer's whereabouts stay unrecorded: the lock pattern, PIN and
 * password fields, drawings and pictures, where a trail of the pointer would
 * show what was drawn or typed.
 */
const PRIVATE_POINTER_TARGETS =
  "[data-debug-private], .pattern-pad, input[type=password], canvas, svg:not(.lucide), img, video";

type Status = "idle" | "starting" | "recording" | "finishing" | "reviewing";

interface RecorderState {
  status: Status;
  startedAt: number;
  recording: DebugRecording | null;
  /** Encoding failed, or the browser couldn't film at all. */
  failed: boolean;
}

export const useDebugRecorder = create<RecorderState>(() => ({
  status: "idle",
  startedAt: 0,
  recording: null,
  failed: false,
}));

let session: Session | null = null;

/** Starts filming, unless it already is. */
export async function startDebugRecording(queryClient?: QueryClient) {
  if (useDebugRecorder.getState().status !== "idle") return;
  useDebugRecorder.setState({ status: "starting", failed: false });
  try {
    session = await Session.start(queryClient);
    useDebugRecorder.setState({
      status: "recording",
      startedAt: session.startedAt,
    });
  } catch {
    session = null;
    useDebugRecorder.setState({ status: "idle", failed: true });
  }
}

/** Stops filming and opens the player. */
export async function stopDebugRecording() {
  const current = session;
  if (!current || useDebugRecorder.getState().status !== "recording") return;
  session = null;
  useDebugRecorder.setState({ status: "finishing" });
  try {
    const recording = await current.stop();
    useDebugRecorder.setState({ status: "reviewing", recording });
  } catch {
    useDebugRecorder.setState({ status: "idle", failed: true });
  }
}

/** The recording was saved or thrown away: recording can start again. */
export function finishDebugReview() {
  useDebugRecorder.setState({ status: "idle", recording: null });
}

export function toggleDebugRecording(queryClient?: QueryClient) {
  const { status } = useDebugRecorder.getState();
  if (status === "idle") void startDebugRecording(queryClient);
  else if (status === "recording") void stopDebugRecording();
}

/** One recording: the film, and everything noted while it ran. */
class Session {
  readonly startedAt = performance.now();
  private readonly startedDate = new Date();
  private readonly events: DebugEvent[] = [];
  private readonly ids = new Pseudonyms();
  private readonly cleanups: (() => void)[] = [];
  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private timer = 0;
  private limit = 0;
  private stopped = false;
  private location = "";
  private pointer: { x: number; y: number; hidden: boolean } | null = null;
  private presses: { x: number; y: number; t: number }[] = [];
  private pressInPrivate = false;
  private frameCosts: number[] = [];

  private constructor(
    private readonly encoder: FrameEncoder,
    private readonly scale: number,
    width: number,
    height: number,
  ) {
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("No 2D canvas");
    this.ctx = ctx;
  }

  static async start(queryClient?: QueryClient) {
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const scale = Math.min(1, LONG_SIDE / Math.max(vw, vh));
    // H.264 wants even sizes.
    const width = Math.max(2, Math.floor((vw * scale) / 2) * 2);
    const height = Math.max(2, Math.floor((vh * scale) / 2) * 2);
    const encoder = await createFrameEncoder(width, height);
    const s = new Session(encoder, scale, width, height);
    s.begin(queryClient, vw, vh);
    return s;
  }

  private get now() {
    return performance.now() - this.startedAt;
  }

  private note(type: string, data: Record<string, unknown> = {}) {
    if (this.stopped || this.events.length >= MAX_EVENTS) return;
    this.events.push({ tMs: Math.round(this.now), type, data });
  }

  private on<K extends keyof WindowEventMap>(
    type: K,
    handler: (e: WindowEventMap[K]) => void,
  ) {
    window.addEventListener(type, handler, { capture: true, passive: true });
    this.cleanups.push(() =>
      window.removeEventListener(type, handler, { capture: true }),
    );
  }

  private begin(queryClient: QueryClient | undefined, vw: number, vh: number) {
    this.note("recording", { action: "start" });
    const media = (q: string) => window.matchMedia(q).matches;
    this.note("screen", {
      width: vw,
      height: vh,
      pixel_ratio: window.devicePixelRatio,
      brightness: document.documentElement.classList.contains("dark")
        ? "dark"
        : "light",
      reduced_motion: media("(prefers-reduced-motion: reduce)"),
      pointer: media("(pointer: coarse)") ? "coarse" : "fine",
    });
    this.note("session", {
      mode: appMode,
      online: navigator.onLine,
      visible: document.visibilityState === "visible",
    });
    this.checkLocation();

    this.on("pointerdown", (e) => this.onPointer("down", e));
    this.on("pointerup", (e) => this.onPointer("up", e));
    this.on("pointercancel", (e) => this.onPointer("cancel", e));
    this.on("pointermove", (e) => this.onPointerMove(e));
    this.on("keydown", (e) => {
      const target = e.target as Element | null;
      const shortcut = e.ctrlKey || e.altKey || e.metaKey;
      // While typing, only shortcuts: Enter and Backspace would count lines.
      if (!shortcut && target && isEditable(target)) return;
      if (target?.closest?.(PRIVATE_POINTER_TARGETS)) return;
      const key = describeKey(e);
      if (key) this.note("key", { key });
    });
    this.on("online", () => this.note("network", { online: true }));
    this.on("offline", () => this.note("network", { online: false }));
    this.on("resize", () =>
      this.note("screen", {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      }),
    );
    this.on("error", (e) => {
      const ev = e as ErrorEvent;
      // A resource that failed to load: say what kind, not where from.
      if (!(ev instanceof ErrorEvent)) {
        const tag = (e.target as Element | null)?.tagName?.toLowerCase();
        if (tag) this.note("resource_error", { element: tag });
        return;
      }
      this.note("error", { ...scrubError(ev.error ?? ev.message, this.ids) });
    });
    this.on("unhandledrejection", (e) =>
      this.note("unhandled_rejection", { ...scrubError(e.reason, this.ids) }),
    );
    const onVisibility = () =>
      this.note("visibility", {
        visible: document.visibilityState === "visible",
      });
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() =>
      document.removeEventListener("visibilitychange", onVisibility),
    );

    this.patchConsole();
    this.patchFetch();
    if (queryClient) this.watchQueries(queryClient);

    this.frame();
    this.limit = window.setTimeout(
      () => void stopDebugRecording(),
      MAX_DURATION_MS,
    );
  }

  private onPointer(action: string, e: PointerEvent) {
    const isPrivate = !!(e.target as Element | null)?.closest?.(
      PRIVATE_POINTER_TARGETS,
    );
    if (action === "down") this.pressInPrivate = isPrivate;
    const hidden = isPrivate || this.pressInPrivate;
    if (action !== "down") this.pressInPrivate = false;
    this.pointer = { x: e.clientX, y: e.clientY, hidden };
    if (hidden) {
      this.note("pointer", { action, private: true });
      return;
    }
    if (action === "down")
      this.presses.push({ x: e.clientX, y: e.clientY, t: this.now });
    this.note("pointer", {
      action,
      kind: e.pointerType,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      button: e.button,
      target: describeTarget(e.target as Element | null),
    });
  }

  private onPointerMove(e: PointerEvent) {
    const isPrivate =
      this.pressInPrivate ||
      !!(e.target as Element | null)?.closest?.(PRIVATE_POINTER_TARGETS);
    this.pointer = { x: e.clientX, y: e.clientY, hidden: isPrivate };
  }

  private checkLocation() {
    const now = location.pathname + location.search;
    if (now === this.location) return;
    this.location = now;
    this.note("route", { location: scrubUrl(now, this.ids) });
  }

  private patchConsole() {
    for (const level of ["error", "warn"] as const) {
      const original = console[level];
      console[level] = (...args: unknown[]) => {
        try {
          this.note("log", {
            level,
            message: truncate(
              args.map((a) => describeLogPart(a, this.ids)).join(" "),
            ),
          });
        } catch {
          // A report must never break the app.
        }
        original.apply(console, args);
      };
      this.cleanups.push(() => {
        console[level] = original;
      });
    }
  }

  private patchFetch() {
    const original = window.fetch;
    const ids = this.ids;
    const note = this.note.bind(this);
    const startedAt = this.startedAt;
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const t0 = performance.now();
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : String(input);
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const path = scrubUrl(url, ids);
      try {
        const response = await original.call(window, input, init);
        note("request", {
          method,
          path,
          status: response.status,
          ms: Math.round(performance.now() - t0),
          started_ms: Math.round(t0 - startedAt),
        });
        return response;
      } catch (error) {
        note("request", {
          method,
          path,
          failed:
            error instanceof Error && /^[A-Za-z]+$/.test(error.name)
              ? error.name
              : "Error",
          ms: Math.round(performance.now() - t0),
        });
        throw error;
      }
    }) as typeof fetch;
    this.cleanups.push(() => {
      if (window.fetch !== original) window.fetch = original;
    });
  }

  private watchQueries(client: QueryClient) {
    const unsubscribeQueries = client.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" && event.type !== "removed") return;
      const query = event.query;
      const data: Record<string, unknown> = {
        key: describeQueryKey(query.queryKey, this.ids),
        status: query.state.status,
        fetch_status: query.state.fetchStatus,
      };
      if (event.type === "updated") data.action = event.action.type;
      else data.action = "removed";
      if (query.state.status === "error" && query.state.error)
        data.error = scrubError(query.state.error, this.ids);
      this.note("query", data);
    });
    const unsubscribeMutations = client
      .getMutationCache()
      .subscribe((event) => {
        if (event.type !== "updated") return;
        const m = event.mutation;
        const key = m.options.mutationKey;
        this.note("mutation", {
          ...(key ? { key: describeQueryKey(key, this.ids) } : {}),
          status: m.state.status,
          ...(m.state.error
            ? { error: scrubError(m.state.error, this.ids) }
            : {}),
        });
      });
    this.cleanups.push(unsubscribeQueries, unsubscribeMutations);
  }

  private frame = () => {
    if (this.stopped) return;
    const began = performance.now();
    const t = this.now;
    try {
      this.checkLocation();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderWireframe(this.ctx, this.scale, (el) =>
        el.hasAttribute(RECORDER_ATTRIBUTE),
      );
      this.drawPointer(t);
      this.encoder.add(this.canvas, t);
    } catch {
      // Skip the frame; the next one may do.
    }
    const cost = performance.now() - began;
    this.frameCosts.push(cost);
    this.timer = window.setTimeout(
      this.frame,
      Math.max(MIN_FRAME_GAP_MS, cost * 2),
    );
  };

  /** The pointer as a dot, and a ring where it pressed. */
  private drawPointer(t: number) {
    const c = this.ctx;
    const s = this.scale;
    this.presses = this.presses.filter((p) => t - p.t < 450);
    for (const p of this.presses) {
      const k = (t - p.t) / 450;
      c.beginPath();
      c.arc(p.x * s, p.y * s, (10 + 18 * k) * s, 0, Math.PI * 2);
      c.strokeStyle = `rgba(239, 68, 68, ${0.9 * (1 - k)})`;
      c.lineWidth = 3 * s;
      c.stroke();
    }
    const p = this.pointer;
    if (!p || p.hidden) return;
    c.beginPath();
    c.arc(p.x * s, p.y * s, 6 * s, 0, Math.PI * 2);
    c.fillStyle = "rgba(239, 68, 68, 0.85)";
    c.fill();
    c.lineWidth = 1.5 * s;
    c.strokeStyle = "#ffffff";
    c.stroke();
  }

  async stop(): Promise<DebugRecording> {
    const costs = this.frameCosts;
    this.note("recording", {
      action: "stop",
      frames_drawn: costs.length,
      draw_ms_avg: Math.round(
        costs.reduce((a, b) => a + b, 0) / Math.max(1, costs.length),
      ),
      draw_ms_max: Math.round(Math.max(0, ...costs)),
    });
    const durationMs = this.now;
    this.stopped = true;
    window.clearTimeout(this.timer);
    window.clearTimeout(this.limit);
    for (const cleanup of this.cleanups.reverse()) cleanup();
    try {
      const video = await this.encoder.finish();
      return {
        startedAt: this.startedDate,
        durationMs,
        video,
        events: this.events,
        app: appInfo(),
        device: deviceInfo(),
      };
    } finally {
      this.encoder.close();
    }
  }
}

function describeLogPart(part: unknown, ids: Pseudonyms) {
  if (typeof part === "string") return keepShape(part, ids);
  return describeValue(part, ids);
}

function isEditable(el: Element) {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

/**
 * What was pressed, by kind: its tag and ARIA role, and the `data-slot` the
 * app's components mark themselves with. No text, label or id.
 */
function describeTarget(el: Element | null): string | undefined {
  const target = el?.closest?.(
    "button, a, input, textarea, select, [role], [data-slot], [contenteditable=true]",
  );
  if (!target) return el?.tagName?.toLowerCase();
  const parts = [target.tagName.toLowerCase()];
  const role = target.getAttribute("role");
  if (role && /^[a-z]+$/.test(role)) parts.push(`role=${role}`);
  const slot = target.getAttribute("data-slot");
  if (slot && /^[a-z-]{1,40}$/.test(slot)) parts.push(`slot=${slot}`);
  if (target instanceof HTMLInputElement && /^[a-z]+$/.test(target.type))
    parts.push(`type=${target.type}`);
  return parts.join(" ");
}

function appInfo() {
  return {
    name: "Anchor+",
    client: "web",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "",
    mode: appMode,
    desktop_app: "anchorDesktop" in window,
    standalone: window.matchMedia("(display-mode: standalone)").matches,
  };
}

/**
 * The browser and system, coarsely: their names and major versions, the
 * language and the screen. Not the user agent string, which says more.
 */
function deviceInfo() {
  const ua = navigator.userAgent;
  const browser =
    /Edg\/(\d+)/.exec(ua)?.[0].replace("/", " ") ??
    /Firefox\/(\d+)/.exec(ua)?.[0].replace("/", " ") ??
    /Chrome\/(\d+)/.exec(ua)?.[0].replace("/", " ") ??
    (/Safari/.test(ua) && /Version\/(\d+)/.exec(ua)
      ? `Safari ${/Version\/(\d+)/.exec(ua)?.[1]}`
      : "other");
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "other";
  return {
    platform: "web",
    browser,
    os,
    locale: navigator.language,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    pixel_ratio: window.devicePixelRatio,
    video_encoder: typeof VideoEncoder !== "undefined" ? "webcodecs" : "jpeg",
  };
}
