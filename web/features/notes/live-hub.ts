import { api, getJson } from "@/lib/api/client";
import { translate } from "@/lib/i18n";
import type { LiveImage, LiveSource } from "./live-images";

/**
 * Live images, between devices: the device that added one shows its camera
 * or screen, and every other device that opens the note asks it for the video
 * and gets it over a direct (WebRTC) connection. The server only passes the
 * messages that set the connection up (api/live/signal, received on the sync
 * stream), never the video.
 *
 * A device keeps one id across restarts; each window of it gets its own, so
 * two windows of one device can watch each other. A camera is turned on while
 * someone watches and off soon after; a screen, which can't be shared again
 * without asking, is shared until stopped.
 */

export interface LivePeer {
  device: string;
  tab?: string;
}

type Kind =
  | "want"
  | "offer"
  | "answer"
  | "ice"
  | "ready"
  | "unavailable"
  | "bye"
  /** The microphone was muted or unmuted. */
  | "mic"
  /** How many watch it now. */
  | "viewers"
  /** From the server: the note was trashed or deleted. */
  | "stop";

export interface LiveSignal {
  noteId: string;
  liveId: string;
  kind: Kind;
  from: LivePeer;
  to?: LivePeer;
  session?: string;
  data?: Record<string, unknown>;
}

export type LiveStatus =
  /** This device is turning its camera on. */
  | "starting"
  /** Asking the other device for the video. */
  | "connecting"
  | "live"
  /** The other device doesn't answer: closed, asleep or offline. */
  | "waiting"
  /** The other device answers but isn't sharing its screen right now. */
  | "paused"
  /** This device's screen, to be shared again by a click. */
  | "needs-share"
  /** This device was refused the camera or screen. */
  | "denied";

/** Whether a live image has sound: its microphone, on or muted. */
export type MicState = "on" | "muted" | null;

export interface LiveView {
  status: LiveStatus;
  stream: MediaStream | null;
  /** Shown from this window's own camera or screen. */
  isOwn: boolean;
  mic: MicState;
  /** How many other windows watch it; null until known. */
  viewers: number | null;
}

/** A microphone to send with the video; `device` for one of several. */
export interface MicChoice {
  device?: string;
  isMuted?: boolean;
}

const DEVICE_KEY = "anchor:live-device";
const OWNED_KEY = "anchor:live-owned";
/** How long to keep a camera on after the last watcher leaves. */
const CAMERA_IDLE_MS = 20_000;
/** How soon to ask again while there is no video. */
const RETRY_MS = 5_000;
/** Without an answer by then, the other device is taken to be away. */
const WAITING_AFTER_MS = 8_000;

const randomId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

let device: string | null = null;

/** This device's id, kept across restarts. */
export function liveDeviceId(): string {
  if (device) return device;
  try {
    device = localStorage.getItem(DEVICE_KEY);
    if (!device) {
      device = randomId();
      localStorage.setItem(DEVICE_KEY, device);
    }
  } catch {
    device = randomId();
  }
  return device;
}

const tab = randomId();

/** A name for this device, as watchers see it while they wait. */
export function liveDeviceLabel(): string {
  const agent = navigator.userAgent;
  const system = /Android/.test(agent)
    ? "Android"
    : /iPhone|iPad/.test(agent)
      ? "iPhone"
      : /Mac OS X/.test(agent)
        ? "Mac"
        : /Windows/.test(agent)
          ? "Windows"
          : /Linux/.test(agent)
            ? "Linux"
            : "";
  const app =
    "anchorDesktop" in window
      ? "Anchor+"
      : /Edg\//.test(agent)
        ? "Edge"
        : /Firefox\//.test(agent)
          ? "Firefox"
          : /Chrome\//.test(agent)
            ? "Chrome"
            : /Safari\//.test(agent)
              ? "Safari"
              : translate("noteHooks.liveHub")("aBrowser");
  return system
    ? translate("noteHooks.liveHub")("deviceOn", { app, system })
    : app;
}

/** Whether this browser can show a live image's video at all. */
export const canWatchLive = () =>
  typeof window !== "undefined" && "RTCPeerConnection" in window;

/** Whether this browser can be the camera or screen of a live image. */
export function canShowLive(source: LiveSource) {
  const media =
    typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
  if (!media || !canWatchLive()) return false;
  return source === "camera"
    ? typeof media.getUserMedia === "function"
    : typeof media.getDisplayMedia === "function";
}

interface Owned {
  noteId: string;
  source: LiveSource;
  camera?: string;
  /** Sent with the video when set. */
  mic?: MicChoice;
  /** Turned off here: not turned on again for a watcher. */
  isOff?: boolean;
}

function readOwned(): Record<string, Owned> {
  try {
    const value = JSON.parse(localStorage.getItem(OWNED_KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeOwned(change: (owned: Record<string, Owned>) => void) {
  const owned = readOwned();
  change(owned);
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(owned));
  } catch {
    // Private mode: this window still shows it until it closes.
  }
}

// ---------------------------------------------------------------------------
// The camera or screen this window shows.

interface Capture {
  noteId: string;
  source: LiveSource;
  stream: MediaStream;
  /** Turned on for a watcher; turned off again once nobody watches. */
  isOnDemand: boolean;
  idle?: ReturnType<typeof setTimeout>;
  release: () => void;
}

const captures = new Map<string, Capture>();

/**
 * Turns on a camera, or asks which screen or window to share, and the
 * microphone with it when `mic` is set.
 */
export async function openSource(
  source: LiveSource,
  camera?: string,
  mic?: MicChoice,
): Promise<MediaStream> {
  const media = navigator.mediaDevices;
  let stream: MediaStream;
  if (source === "screen") {
    stream = await media.getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 } },
      audio: false,
    });
    for (const track of stream.getVideoTracks()) track.contentHint = "detail";
  } else {
    stream = await media.getUserMedia({
      video: {
        ...(camera ? { deviceId: { ideal: camera } } : {}),
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  }
  return mic ? addMicrophone(stream, mic) : stream;
}

/** Adds a microphone's sound to `stream`; stops it all if that fails. */
export async function addMicrophone(
  stream: MediaStream,
  mic: MicChoice,
): Promise<MediaStream> {
  try {
    const voice = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(mic.device ? { deviceId: { ideal: mic.device } } : {}),
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    for (const track of voice.getAudioTracks()) {
      track.enabled = !mic.isMuted;
      stream.addTrack(track);
    }
    return stream;
  } catch (error) {
    for (const track of stream.getTracks()) track.stop();
    throw error;
  }
}

/** The microphones this device has; their names once one has been allowed. */
export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  } catch {
    return [];
  }
}

function micOf(stream: MediaStream | null): MicState {
  const tracks = stream?.getAudioTracks?.() ?? [];
  if (!tracks.length) return null;
  return tracks.some((track) => track.enabled) ? "on" : "muted";
}

/** The cameras this device has; their names once one has been allowed. */
export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

/**
 * Takes over `stream` as live image `liveId`'s video, shown from this window
 * from now on, and remembers that this device shows it.
 */
export function adoptSource(
  liveId: string,
  noteId: string,
  source: LiveSource,
  stream: MediaStream,
  options: { camera?: string; mic?: MicChoice; isOnDemand?: boolean } = {},
) {
  stopCapture(liveId);
  let release = () => {};
  // One window of the device answers for it; the others leave it be.
  navigator.locks
    ?.request(
      `anchor-live-${liveId}`,
      () =>
        new Promise<void>((done) => {
          release = done;
        }),
    )
    .catch(() => {});
  const capture: Capture = {
    noteId,
    source,
    stream,
    isOnDemand: !!options.isOnDemand,
    release: () => release(),
  };
  captures.set(liveId, capture);
  writeOwned((owned) => {
    owned[liveId] = {
      noteId,
      source,
      camera: options.camera,
      ...(options.mic ? { mic: options.mic } : {}),
    };
  });
  for (const track of stream.getVideoTracks())
    track.addEventListener("ended", () => {
      if (captures.get(liveId) === capture) stopCapture(liveId);
    });
  update(liveId);
  void send({ noteId, liveId, kind: "ready", from: me() });
  scheduleIdle(liveId);
}

/**
 * Stops showing the camera or screen; watchers wait for it to come back.
 * `isTurnedOff`: by the person here, so a watcher doesn't turn it on again.
 */
export function stopCapture(
  liveId: string,
  { notify = true, isTurnedOff = false } = {},
) {
  const capture = captures.get(liveId);
  if (!capture) return;
  if (isTurnedOff)
    writeOwned((owned) => {
      const entry = owned[liveId];
      if (entry) entry.isOff = true;
    });
  captures.delete(liveId);
  clearTimeout(capture.idle);
  for (const track of capture.stream.getTracks()) track.stop();
  capture.release();
  for (const [session, sender] of senders) {
    if (sender.liveId !== liveId) continue;
    if (notify)
      void send({
        noteId: capture.noteId,
        liveId,
        kind: "bye",
        from: me(),
        to: sender.to,
        session,
      });
    sender.pc.close();
    senders.delete(session);
  }
  // This device's own: shown again by a click.
  const w = watching.get(liveId);
  if (w) {
    closeWatch(w);
    w.status = "needs-share";
    w.stream = null;
  } else if (listeners.has(liveId)) {
    const shown = newWatcher(liveId, capture.noteId, liveDeviceId());
    shown.status = "needs-share";
    askForVideo(shown);
  }
  update(liveId);
}

/**
 * Stops every live image of note `noteId`, shown here or watched: the note
 * was trashed or deleted. They stay off, so restoring the note shows them
 * stopped until they are turned on again.
 */
export function closeLiveImages(noteId: string) {
  writeOwned((owned) => {
    for (const entry of Object.values(owned))
      if (entry.noteId === noteId) entry.isOff = true;
  });
  for (const [liveId, capture] of [...captures])
    if (capture.noteId === noteId) stopCapture(liveId, { isTurnedOff: true });
  for (const w of watching.values()) {
    if (w.noteId !== noteId || captures.has(w.liveId)) continue;
    if (w.peer)
      void send({
        noteId,
        liveId: w.liveId,
        kind: "bye",
        from: me(),
        to: w.peer,
        session: w.session,
      });
    closeWatch(w);
    setWatcher(w, w.owner === liveDeviceId() ? "needs-share" : "paused", null);
  }
}

/**
 * Mutes or unmutes the microphone of live image `liveId`, shown here; the
 * video goes on, and watchers are told.
 */
export function setMicMuted(liveId: string, isMuted: boolean) {
  const capture = captures.get(liveId);
  if (!capture) return;
  for (const track of capture.stream.getAudioTracks()) track.enabled = !isMuted;
  writeOwned((owned) => {
    const mic = owned[liveId]?.mic;
    if (mic) mic.isMuted = isMuted;
  });
  const mic = micOf(capture.stream);
  for (const [session, sender] of senders)
    if (sender.liveId === liveId)
      void send({
        noteId: capture.noteId,
        liveId,
        kind: "mic",
        from: me(),
        to: sender.to,
        session,
        data: { mic },
      });
  update(liveId);
}

/** The windows watching live image `liveId` from this one. */
function viewerCount(liveId: string) {
  let count = 0;
  for (const sender of senders.values())
    if (sender.liveId === liveId && sender.pc.connectionState === "connected")
      count++;
  return count;
}

/** Tells this window and every watcher how many watch now. */
function announceViewers(liveId: string) {
  const capture = captures.get(liveId);
  if (!capture) return;
  const count = viewerCount(liveId);
  for (const [session, sender] of senders)
    if (sender.liveId === liveId)
      void send({
        noteId: capture.noteId,
        liveId,
        kind: "viewers",
        from: me(),
        to: sender.to,
        session,
        data: { count },
      });
  update(liveId);
}

/** Stops it for good: the live image is gone from the note. */
export function forgetSource(liveId: string) {
  stopCapture(liveId);
  writeOwned((owned) => {
    delete owned[liveId];
  });
}

/** The live images of note `noteId` this window shows its camera or screen in. */
export function capturedIn(noteId: string): string[] {
  return [...captures].filter(([, c]) => c.noteId === noteId).map(([id]) => id);
}

/** Whether this device shows live image `liveId`. */
export function isOwnedHere(image: LiveImage) {
  return image.device === liveDeviceId();
}

function scheduleIdle(liveId: string) {
  const capture = captures.get(liveId);
  if (!capture?.isOnDemand) return;
  clearTimeout(capture.idle);
  capture.idle = undefined;
  const watched =
    (listeners.get(liveId)?.size ?? 0) > 0 ||
    [...senders.values()].some((s) => s.liveId === liveId);
  if (!watched)
    capture.idle = setTimeout(() => {
      if (captures.get(liveId) === capture) stopCapture(liveId);
    }, CAMERA_IDLE_MS);
}

// ---------------------------------------------------------------------------
// Connections: this window sending its video, or watching another's.

interface Sender {
  pc: RTCPeerConnection;
  liveId: string;
  noteId: string;
  to: LivePeer;
  session: string;
}

interface Watcher {
  liveId: string;
  noteId: string;
  owner: string;
  session: string;
  pc: RTCPeerConnection | null;
  peer: LivePeer | null;
  stream: MediaStream | null;
  status: LiveStatus;
  mic: MicState;
  viewers: number | null;
  pending: RTCIceCandidateInit[];
  retry?: ReturnType<typeof setTimeout>;
  away?: ReturnType<typeof setTimeout>;
}

const senders = new Map<string, Sender>();
const watching = new Map<string, Watcher>();

const me = (): LivePeer => ({ device: liveDeviceId(), tab });

let iceServers: Promise<RTCIceServer[]> | null = null;
function loadIceServers() {
  iceServers ??= getJson<{ iceServers?: RTCIceServer[] }>("api/live/config")
    .then((config) => config.iceServers ?? [])
    .catch(() => {
      iceServers = null;
      return [];
    });
  return iceServers;
}

async function send(signal: LiveSignal) {
  try {
    await api.post("api/live/signal", { json: signal });
  } catch {
    // Asked again by the retry, or the next "ready".
  }
}

async function offer(
  liveId: string,
  noteId: string,
  to: LivePeer,
  session: string,
) {
  const capture = captures.get(liveId);
  if (!capture) return;
  senders.get(session)?.pc.close();
  const pc = new RTCPeerConnection({ iceServers: await loadIceServers() });
  const sender: Sender = { pc, liveId, noteId, to, session };
  senders.set(session, sender);
  clearTimeout(capture.idle);
  for (const track of capture.stream.getTracks())
    pc.addTrack(track, capture.stream);
  pc.onicecandidate = (e) => {
    if (e.candidate)
      void send({
        noteId,
        liveId,
        kind: "ice",
        from: me(),
        to,
        session,
        data: e.candidate.toJSON() as Record<string, unknown>,
      });
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") announceViewers(liveId);
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      pc.close();
      if (senders.get(session) === sender) senders.delete(session);
      scheduleIdle(liveId);
      announceViewers(liveId);
    }
  };
  const description = await pc.createOffer();
  await pc.setLocalDescription(description);
  if (senders.get(session) !== sender) return;
  void send({
    noteId,
    liveId,
    kind: "offer",
    from: me(),
    to,
    session,
    data: {
      type: description.type,
      sdp: description.sdp,
      mic: micOf(capture.stream),
    },
  });
}

/** Whether no window of this device shows live image `liveId`. */
async function isFree(liveId: string) {
  const locks = navigator.locks;
  if (!locks) return true;
  return locks.request(
    `anchor-live-${liveId}`,
    { ifAvailable: true },
    (lock) => !!lock,
  );
}

/** A watcher asks for the video; the window that shows it answers. */
async function answerWant(signal: LiveSignal) {
  const { liveId, noteId, from, session } = signal;
  if (!session) return;
  const capture = captures.get(liveId);
  if (capture) {
    if (capture.noteId === noteId) await offer(liveId, noteId, from, session);
    return;
  }
  const owned = readOwned()[liveId];
  if (!owned || owned.noteId !== noteId) return;
  const unavailable = () =>
    send({
      noteId,
      liveId,
      kind: "unavailable",
      from: me(),
      to: from,
      session,
    });
  // Another window of this device shows it, and answers.
  if (!(await isFree(liveId)) || captures.has(liveId)) return;
  if (owned.source === "screen" || owned.isOff) {
    void unavailable();
    return;
  }
  // No window shows the camera: this one turns it on.
  try {
    const stream = await openSource("camera", owned.camera, owned.mic);
    if (captures.has(liveId)) {
      for (const track of stream.getTracks()) track.stop();
    } else
      adoptSource(liveId, noteId, "camera", stream, {
        camera: owned.camera,
        mic: owned.mic,
        isOnDemand: true,
      });
    await offer(liveId, noteId, from, session);
  } catch {
    void unavailable();
  }
}

function setWatcher(w: Watcher, status: LiveStatus, stream = w.stream) {
  w.status = status;
  w.stream = stream;
  update(w.liveId);
}

function closeWatch(w: Watcher) {
  w.pc?.close();
  w.pc = null;
  w.peer = null;
  w.pending = [];
}

function askForVideo(w: Watcher) {
  clearTimeout(w.retry);
  if (watching.get(w.liveId) !== w) return;
  // Not while this window shows it, or an offer is being taken up.
  if (w.status !== "live" && !w.pc && !captures.has(w.liveId))
    void send({
      noteId: w.noteId,
      liveId: w.liveId,
      kind: "want",
      from: me(),
      to: { device: w.owner },
      session: w.session,
    });
  w.retry = setTimeout(() => askForVideo(w), RETRY_MS);
  if (!w.away && w.status === "connecting")
    w.away = setTimeout(() => {
      w.away = undefined;
      if (w.status === "connecting") setWatcher(w, "waiting");
    }, WAITING_AFTER_MS);
}

async function takeOffer(w: Watcher, signal: LiveSignal) {
  const data = signal.data as RTCSessionDescriptionInit | undefined;
  if (!data?.sdp) return;
  closeWatch(w);
  w.mic = readMic(signal.data?.mic);
  const pc = new RTCPeerConnection({ iceServers: await loadIceServers() });
  w.pc = pc;
  w.peer = signal.from;
  const to = signal.from;
  pc.ontrack = (e) => {
    if (w.pc !== pc) return;
    setWatcher(w, w.status, e.streams[0] ?? new MediaStream([e.track]));
  };
  pc.onicecandidate = (e) => {
    if (e.candidate)
      void send({
        noteId: w.noteId,
        liveId: w.liveId,
        kind: "ice",
        from: me(),
        to,
        session: w.session,
        data: e.candidate.toJSON() as Record<string, unknown>,
      });
  };
  pc.onconnectionstatechange = () => {
    if (w.pc !== pc) return;
    if (pc.connectionState === "connected") {
      setWatcher(w, "live");
    } else if (
      pc.connectionState === "failed" ||
      pc.connectionState === "closed"
    ) {
      closeWatch(w);
      setWatcher(w, "connecting", null);
      askForVideo(w);
    }
  };
  await pc.setRemoteDescription(data);
  for (const candidate of w.pending.splice(0))
    await pc.addIceCandidate(candidate).catch(() => {});
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  if (w.pc !== pc) return;
  void send({
    noteId: w.noteId,
    liveId: w.liveId,
    kind: "answer",
    from: me(),
    to,
    session: w.session,
    data: { type: answer.type, sdp: answer.sdp },
  });
}

const readMic = (value: unknown): MicState =>
  value === "on" || value === "muted" ? value : null;

/** A message from the sync stream (see use-sync.ts). */
export function receiveLiveSignal(message: unknown) {
  const signal = message as Partial<LiveSignal> | null;
  if (
    !signal ||
    typeof signal.liveId !== "string" ||
    typeof signal.noteId !== "string" ||
    typeof signal.from?.device !== "string"
  )
    return;
  const s = signal as LiveSignal;
  if (s.kind === "stop") {
    closeLiveImages(s.noteId);
    return;
  }
  if (s.from.device === liveDeviceId() && s.from.tab === tab) return;
  if (
    s.to &&
    (s.to.device !== liveDeviceId() || (s.to.tab && s.to.tab !== tab))
  )
    return;

  const w = watching.get(s.liveId);
  const isMine = !!w && w.noteId === s.noteId && s.session === w.session;
  switch (s.kind) {
    case "want":
      void answerWant(s);
      return;
    case "answer": {
      const sender = s.session ? senders.get(s.session) : undefined;
      const data = s.data as RTCSessionDescriptionInit | undefined;
      if (
        sender &&
        data?.sdp &&
        sender.pc.signalingState === "have-local-offer"
      )
        void sender.pc.setRemoteDescription(data).catch(() => {});
      return;
    }
    case "ice": {
      const candidate = s.data as RTCIceCandidateInit | undefined;
      if (!candidate) return;
      const sender = s.session ? senders.get(s.session) : undefined;
      if (sender && s.from.device === sender.to.device) {
        void sender.pc.addIceCandidate(candidate).catch(() => {});
      } else if (isMine && w) {
        if (w.pc?.remoteDescription)
          void w.pc.addIceCandidate(candidate).catch(() => {});
        else w.pending.push(candidate);
      }
      return;
    }
    case "offer":
      if (isMine && w) void takeOffer(w, s).catch(() => {});
      return;
    case "mic":
      if (isMine && w) {
        w.mic = readMic(s.data?.mic);
        update(w.liveId);
      }
      return;
    case "viewers": {
      const count = s.data?.count;
      if (isMine && w && typeof count === "number" && count >= 0) {
        w.viewers = Math.floor(count);
        update(w.liveId);
      }
      return;
    }
    case "unavailable":
      if (isMine && w && w.status !== "live") setWatcher(w, "paused");
      return;
    case "bye": {
      // A watcher left, or the video stopped.
      const sender = s.session ? senders.get(s.session) : undefined;
      if (sender && s.from.device === sender.to.device) {
        sender.pc.close();
        senders.delete(s.session!);
        scheduleIdle(sender.liveId);
        announceViewers(sender.liveId);
      } else if (isMine && w) {
        closeWatch(w);
        setWatcher(w, "paused", null);
      }
      return;
    }
    case "ready":
      if (w && w.noteId === s.noteId && w.status !== "live") {
        setWatcher(w, "connecting");
        askForVideo(w);
      }
      return;
  }
}

// ---------------------------------------------------------------------------
// What the note shows.

type Listener = (view: LiveView) => void;
const listeners = new Map<string, Set<Listener>>();

export function viewOf(liveId: string): LiveView {
  const capture = captures.get(liveId);
  if (capture)
    return {
      status: "live",
      stream: capture.stream,
      isOwn: true,
      mic: micOf(capture.stream),
      viewers: viewerCount(liveId),
    };
  const w = watching.get(liveId);
  if (w)
    return {
      status: w.status,
      stream: w.stream,
      isOwn: false,
      mic: w.mic,
      viewers: w.viewers,
    };
  return {
    status: "connecting",
    stream: null,
    isOwn: false,
    mic: null,
    viewers: null,
  };
}

function update(liveId: string) {
  const view = viewOf(liveId);
  for (const listener of listeners.get(liveId) ?? []) listener(view);
}

const denied = new Set<string>();

/**
 * Shows live image `image` of note `noteId`: from this window's camera or
 * screen when it shows it, else from the window of its device that does.
 * Call the result when it is no longer shown.
 */
export function watchLive(
  image: LiveImage,
  noteId: string,
  listener: Listener,
): () => void {
  const { id } = image;
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(listener);
  if (set.size === 1) begin(image, noteId);
  listener(viewOf(id));
  return () => {
    set.delete(listener);
    if (set.size) return;
    listeners.delete(id);
    const w = watching.get(id);
    if (w) {
      if (w.peer)
        void send({
          noteId: w.noteId,
          liveId: id,
          kind: "bye",
          from: me(),
          to: w.peer,
          session: w.session,
        });
      clearTimeout(w.retry);
      clearTimeout(w.away);
      closeWatch(w);
      watching.delete(id);
    }
    scheduleIdle(id);
  };
}

function begin(image: LiveImage, noteId: string) {
  if (!canWatchLive()) return;
  const { id } = image;
  if (captures.has(id)) {
    scheduleIdle(id);
    return;
  }
  const w = newWatcher(id, noteId, image.device);
  if (isOwnedHere(image)) {
    if (image.source === "screen" || readOwned()[id]?.isOff) {
      // Shared from another window of this device, or to be shared again.
      w.status = "needs-share";
    } else if (!denied.has(id)) {
      w.status = "starting";
      void startOwnCamera(image, noteId, w);
    }
  }
  askForVideo(w);
}

function newWatcher(liveId: string, noteId: string, owner: string) {
  const w: Watcher = {
    liveId,
    noteId,
    owner,
    session: randomId(),
    pc: null,
    peer: null,
    stream: null,
    status: "connecting",
    mic: null,
    viewers: null,
    pending: [],
  };
  watching.set(liveId, w);
  return w;
}

async function startOwnCamera(image: LiveImage, noteId: string, w: Watcher) {
  // Another window of this device has it on; watch that one.
  if (!(await isFree(image.id))) {
    if (w.status === "starting") setWatcher(w, "connecting");
    return;
  }
  try {
    const mic = readOwned()[image.id]?.mic;
    const stream = await openSource("camera", image.camera, mic);
    if (captures.has(image.id) || !listeners.has(image.id)) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    adoptSource(image.id, noteId, "camera", stream, {
      camera: image.camera,
      mic,
      isOnDemand: true,
    });
  } catch {
    denied.add(image.id);
    if (watching.get(image.id) === w) setWatcher(w, "denied");
  }
}

/** Shares this device's screen (or camera) again, after a click. */
export async function restartSource(image: LiveImage, noteId: string) {
  denied.delete(image.id);
  const mic = readOwned()[image.id]?.mic;
  const stream = await openSource(image.source, image.camera, mic);
  adoptSource(image.id, noteId, image.source, stream, {
    camera: image.camera,
    mic,
    isOnDemand: image.source === "camera",
  });
}

/** For tests: forgets every capture and connection. */
export function resetLiveHub() {
  for (const id of [...captures.keys()]) stopCapture(id, { notify: false });
  for (const w of watching.values()) {
    clearTimeout(w.retry);
    clearTimeout(w.away);
    closeWatch(w);
  }
  watching.clear();
  listeners.clear();
  denied.clear();
  iceServers = null;
}
