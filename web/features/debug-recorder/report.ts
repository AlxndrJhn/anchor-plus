import { type MetaSample, muxDebugMp4, type VideoTrack } from "./mp4";

/** Where reports are filed. */
export const DEBUG_REPORT_REPOSITORY = "AlxndrJhn/anchor-plus";

/** Something that happened while recording, `tMs` after it started. */
export interface DebugEvent {
  tMs: number;
  type: string;
  data: Record<string, unknown>;
}

/** A moment the user marked: "problem here", and what they expected. */
export interface DebugProblem {
  tMs: number;
  expectation: string;
}

/** A finished recording: its video and what happened meanwhile. */
export interface DebugRecording {
  startedAt: Date;
  durationMs: number;
  video: VideoTrack;
  events: DebugEvent[];
  app: Record<string, unknown>;
  device: Record<string, unknown>;
}

/** `mm:ss.s` of a moment in the video. */
export function formatVideoTime(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${seconds}`;
}

/** ISO 8601 in UTC to the second: `2026-10-28T14:03:22Z`. */
export const isoSecond = (time: Date) => `${time.toISOString().slice(0, 19)}Z`;

/** `anchor-debug-2026-10-28T14-03-22Z.mp4`, as on Android. */
export const debugReportFilename = (startedAt: Date) =>
  `anchor-debug-${isoSecond(startedAt).replaceAll(":", "-")}.mp4`;

const problemJson = (p: DebugProblem) => ({
  type: "problem",
  t_ms: Math.round(p.tMs),
  timestamp: formatVideoTime(p.tMs),
  expectation: p.expectation,
});

const eventJson = (e: DebugEvent) => ({
  t_ms: Math.round(e.tMs),
  type: e.type,
  ...e.data,
});

const byTime = (problems: DebugProblem[]) =>
  [...problems].sort((a, b) => a.tMs - b.tMs);

/** The one document a machine reads the whole report from. */
export function debugSummary(
  recording: DebugRecording,
  problems: DebugProblem[],
) {
  const { video } = recording;
  return {
    format: "anchor-debug/1",
    app: recording.app,
    device: recording.device,
    recording: {
      started_at: recording.startedAt.toISOString(),
      duration_ms: Math.round(recording.durationMs),
      frame_count: video.samples.length,
      video_codec: video.kind === "h264" ? "h264" : "mjpeg",
      video_width: video.width,
      video_height: video.height,
      // What the film shows: see render.ts.
      rendering: "wireframe: text as bars, pictures as boxes",
    },
    problems: byTime(problems).map(problemJson),
    events: recording.events.map(eventJson),
  };
}

/**
 * The report as one MP4: the video, the events and problems as a timed
 * metadata track, and {@link debugSummary} in the file's metadata.
 */
export function buildDebugReport(
  recording: DebugRecording,
  problems: DebugProblem[],
): Uint8Array {
  const events: MetaSample[] = [
    ...recording.events.map((e) => ({
      tMs: e.tMs,
      json: JSON.stringify(eventJson(e)),
    })),
    ...problems.map((p) => ({
      tMs: p.tMs,
      json: JSON.stringify(problemJson(p)),
    })),
  ];
  return muxDebugMp4({
    video: recording.video,
    durationMs: recording.durationMs,
    events,
    summary: JSON.stringify(debugSummary(recording, problems), null, 2),
  });
}

/**
 * GitHub's "new issue" page, filled in with the problems and a reminder to
 * attach `filename`: GitHub takes attachments no other way.
 */
export function debugIssueUrl({
  startedAt,
  problems,
  filename,
  appVersion,
  repo = DEBUG_REPORT_REPOSITORY,
}: {
  startedAt: Date;
  problems: DebugProblem[];
  filename: string;
  appVersion: string;
  repo?: string;
}) {
  const lines = ["## Problems", ""];
  if (!problems.length) lines.push("_None marked._");
  for (const p of byTime(problems)) {
    const expectation = p.expectation.trim().replace(/\s*\n\s*/g, " ");
    lines.push(
      `- [${formatVideoTime(p.tMs)}] Expectation: ${expectation || "(not given)"}`,
    );
  }
  lines.push(
    "",
    `App version: ${appVersion} (web)`,
    "",
    `Debug package: please attach the saved file \`${filename}\` here (drag it into this box). It holds the screen recording, the app’s state over time and the problems above.`,
  );
  let body = lines.join("\n");
  // Browsers and GitHub cut off long links.
  if (body.length > 6000) body = `${body.slice(0, 6000)}…`;
  const url = new URL(`https://github.com/${repo}/issues/new`);
  url.searchParams.set("title", `Debug report ${isoSecond(startedAt)}`);
  url.searchParams.set("body", body);
  return url.toString();
}
