"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { translate } from "@/lib/i18n";
import {
  canWatchLive,
  type LiveStatus,
  type LiveView,
  restartSource,
  setMicMuted,
  viewOf,
  watchLive,
} from "../live-hub";
import { cropLayout, type LiveImage, parseLiveImage } from "../live-images";
import { cropPixels, WHOLE_PICTURE } from "../picture-edits";

/** How long a tap waits to see if it is a double tap. */
const DOUBLE_TAP_MS = 260;

const t = () => translate("noteHooks.liveImages");

function statusText(image: LiveImage, view: LiveView): string {
  const who = image.label ?? t()("whoDefault");
  const screen = image.source === "screen";
  const texts: Record<LiveStatus, string> = {
    starting: t()("starting"),
    connecting: t()("connecting", { who }),
    waiting: t()("waiting", { who }),
    paused: screen
      ? t()("pausedScreen", { who })
      : t()("pausedCamera", { who }),
    "needs-share": screen ? t()("screenNotShared") : t()("cameraOff"),
    denied: t()("denied"),
    live: "",
  };
  return texts[view.status];
}

function actionText(
  status: LiveStatus,
  source: LiveImage["source"],
): string | undefined {
  if (status === "needs-share")
    return source === "screen" ? t()("shareScreen") : t()("turnCameraOn");
  if (status === "denied") return t()("tryAgain");
  return undefined;
}

// Lucide's mic, mic-off, volume-2 and volume-x, drawn inside the text.
const ICONS = {
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  micOff:
    '<line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>',
  sound:
    '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  silent:
    '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
};

function icon(paths: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function soundButton(className: string, label: string, paths: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `live-sound-button ${className}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon(paths);
  return button;
}

/**
 * The sound controls: this device mutes its microphone; the others turn
 * the sound on (it starts off, as browsers want) and see when it's muted.
 */
function showSound(node: HTMLElement, view: LiveView, video: HTMLVideoElement) {
  const frame = node.querySelector(".live-frame");
  if (!frame) return;
  let bar = frame.querySelector<HTMLElement>(".live-sound");
  if (!bar) {
    bar = document.createElement("span");
    bar.className = "live-sound";
    frame.appendChild(bar);
  }
  bar.replaceChildren();
  if (view.status !== "live" || !view.mic) return;
  if (view.isOwn) {
    // Never played here: it would echo.
    video.muted = true;
    const isMuted = view.mic === "muted";
    const mic = soundButton(
      "live-mic",
      isMuted ? t()("unmuteMic") : t()("muteMic"),
      isMuted ? ICONS.micOff : ICONS.mic,
    );
    if (isMuted) mic.dataset.off = "";
    bar.appendChild(mic);
    return;
  }
  if (view.mic === "muted") {
    const muted = document.createElement("span");
    muted.className = "live-mic-muted";
    muted.title = t()("micMuted");
    muted.setAttribute("aria-label", t()("micMuted"));
    muted.innerHTML = icon(ICONS.micOff);
    bar.appendChild(muted);
  }
  bar.appendChild(
    soundButton(
      "live-speaker",
      video.muted ? t()("soundOn") : t()("soundOff"),
      video.muted ? ICONS.silent : ICONS.sound,
    ),
  );
}

/** Fits the video in its frame so only the crop shows. */
function layOut(node: HTMLElement, image: LiveImage, video: HTMLVideoElement) {
  const frame = node.querySelector<HTMLElement>(".live-frame");
  if (!frame) return;
  const layout = cropLayout(image.crop, video.videoWidth, video.videoHeight);
  frame.style.aspectRatio = String(layout.aspect);
  video.style.width = `${layout.width}%`;
  video.style.height = `${layout.height}%`;
  video.style.left = `${layout.left}%`;
  video.style.top = `${layout.top}%`;
}

function show(node: HTMLElement, image: LiveImage, view: LiveView) {
  const video = node.querySelector("video");
  const status = node.querySelector<HTMLElement>(".live-status");
  if (!video || !status) return;
  if (video.srcObject !== view.stream) video.srcObject = view.stream;
  if (view.stream) void video.play().catch(() => {});
  node.dataset.status =
    view.stream && view.status === "live" ? "live" : view.status;
  const text = statusText(image, view);
  const action = view.isOwn ? undefined : actionText(view.status, image.source);
  status.replaceChildren();
  if (text) {
    const line = document.createElement("span");
    line.textContent = text;
    status.appendChild(line);
  }
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "live-action";
    button.textContent = action;
    status.appendChild(button);
  }
  showSound(node, view, video);
  showViewers(node, view);
}

/** How many watch, beside the red dot: others for this device's own. */
function showViewers(node: HTMLElement, view: LiveView) {
  const viewers = node.querySelector<HTMLElement>(".live-viewers");
  if (!viewers) return;
  const count = view.viewers;
  viewers.hidden = count === null;
  if (count === null) return;
  viewers.innerHTML = `${icon(ICONS.eye)}<span>${count}</span>`;
  const label = count === 1 ? "1 watching" : `${count} watching`;
  viewers.setAttribute("aria-label", label);
  viewers.title = label;
}

/**
 * A still of what the live image shows, its crop only, named for the moment
 * it was taken (as an ISO 8601 time).
 */
async function stillOf(node: HTMLElement, image: LiveImage): Promise<File> {
  const video = node.querySelector("video");
  if (!video?.videoWidth) throw new Error("No video yet");
  const area = cropPixels(
    image.crop ?? WHOLE_PICTURE,
    video.videoWidth,
    video.videoHeight,
  );
  const taken = new Date();
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas");
  context.drawImage(
    video,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject()), "image/jpeg", 0.92),
  );
  return new File([blob], `${taken.toISOString()}.jpg`, {
    type: "image/jpeg",
    lastModified: taken.getTime(),
  });
}

/** A flash over the video, as a camera's shutter. */
function flash(node: HTMLElement) {
  delete node.dataset.flash;
  void node.offsetWidth;
  node.dataset.flash = "";
  setTimeout(() => delete node.dataset.flash, 400);
}

/** Spins the red dot into an anchor and back. */
function spin(node: HTMLElement) {
  delete node.dataset.spin;
  // A new animation even while one runs.
  void node.offsetWidth;
  node.dataset.spin = "";
  const mark = node.querySelector(".live-mark");
  mark?.addEventListener("animationend", () => delete node.dataset.spin, {
    once: true,
  });
}

/**
 * Shows the live images in the editor's text: their video, or why there is
 * none yet, and a button to share again what this device shows. A tap spins
 * the red dot; a double tap keeps a still in the note's attachments, through
 * `saveStill` (none in a note that can't be changed).
 */
export function useLiveImages(
  container: HTMLElement | null,
  noteId?: string,
  saveStill?: (files: File[]) => Promise<unknown>,
) {
  // Read when used: a new function each render mustn't reconnect the video.
  const save = useRef(saveStill);
  save.current = saveStill;
  useEffect(() => {
    if (!container || !noteId) return;
    const bound = new Map<HTMLElement, { value: string; unbind: () => void }>();

    const bind = (node: HTMLElement) => {
      const value = node.getAttribute("data-value") ?? "";
      const image = parseLiveImage(value);
      const video = node.querySelector("video");
      if (!image || !video) return;
      if (!canWatchLive()) {
        show(node, image, {
          status: "waiting",
          stream: null,
          isOwn: false,
          mic: null,
          viewers: null,
        });
        const status = node.querySelector(".live-status");
        if (status) status.textContent = t()("unsupported");
        bound.set(node, { value, unbind: () => {} });
        return;
      }
      const place = () => layOut(node, image, video);
      video.addEventListener("loadedmetadata", place);
      video.addEventListener("resize", place);
      place();
      const stop = watchLive(image, noteId, (view) => show(node, image, view));
      bound.set(node, {
        value,
        unbind: () => {
          stop();
          video.removeEventListener("loadedmetadata", place);
          video.removeEventListener("resize", place);
          video.srcObject = null;
        },
      });
    };

    const scan = () => {
      for (const [node, { value, unbind }] of bound)
        if (!node.isConnected || node.getAttribute("data-value") !== value) {
          unbind();
          bound.delete(node);
        }
      for (const node of container.querySelectorAll<HTMLElement>(
        ".ql-editor .live-image",
      ))
        if (!bound.has(node)) bind(node);
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(container, { childList: true, subtree: true });

    // Keeps the caret where it was: the buttons are inside the text, and a
    // click on the video mustn't select the live image (typing would then
    // replace it).
    const press = (e: Event) => {
      if (
        (e.target as Element | null)?.closest?.(
          ".live-action, .live-sound-button, .ql-editor .live-frame",
        )
      )
        e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const sound = (e.target as Element | null)?.closest?.(
        ".live-sound-button",
      );
      const soundNode = sound?.closest<HTMLElement>(".live-image");
      const soundImage = parseLiveImage(soundNode?.getAttribute("data-value"));
      if (sound && soundNode && soundImage) {
        e.preventDefault();
        e.stopPropagation();
        const view = viewOf(soundImage.id);
        if (sound.classList.contains("live-mic")) {
          setMicMuted(soundImage.id, view.mic === "on");
          return;
        }
        const video = soundNode.querySelector("video");
        if (!video) return;
        video.muted = !video.muted;
        if (!video.muted) void video.play().catch(() => {});
        showSound(soundNode, view, video);
        return;
      }
      const target = e.target as Element | null;
      const tapped = target?.closest?.<HTMLElement>(".ql-editor .live-image");
      if (
        tapped?.dataset.status === "live" &&
        !target?.closest?.("button, .live-status")
      ) {
        // The second tap of a double tap only takes the still.
        if (e.detail > 1) return;
        clearTimeout(pendingSpin);
        pendingSpin = setTimeout(() => spin(tapped), DOUBLE_TAP_MS);
        return;
      }
      const button = target?.closest?.(".live-action");
      const node = button?.closest<HTMLElement>(".live-image");
      const image = parseLiveImage(node?.getAttribute("data-value"));
      if (!image) return;
      e.preventDefault();
      e.stopPropagation();
      restartSource(image, noteId).catch(() =>
        toast.error(
          image.source === "screen" ? t()("shareFailed") : t()("cameraFailed"),
        ),
      );
    };
    const doubleTap = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const node = target?.closest?.<HTMLElement>(".ql-editor .live-image");
      const image = parseLiveImage(node?.getAttribute("data-value"));
      if (!node || !image || node.dataset.status !== "live") return;
      if (target?.closest?.("button, .live-status")) return;
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(pendingSpin);
      const keep = save.current;
      if (!keep) return;
      flash(node);
      stillOf(node, image)
        .then((file) => keep([file]))
        .then(
          () => toast.success(t()("stillAdded")),
          () => toast.error(t()("stillFailed")),
        );
    };
    let pendingSpin: ReturnType<typeof setTimeout> | undefined;
    container.addEventListener("mousedown", press);
    container.addEventListener("click", click);
    container.addEventListener("dblclick", doubleTap);
    return () => {
      observer.disconnect();
      clearTimeout(pendingSpin);
      container.removeEventListener("mousedown", press);
      container.removeEventListener("click", click);
      container.removeEventListener("dblclick", doubleTap);
      for (const { unbind } of bound.values()) unbind();
      bound.clear();
    };
  }, [container, noteId]);
}
