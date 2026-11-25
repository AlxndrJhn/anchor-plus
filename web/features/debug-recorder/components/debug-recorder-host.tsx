"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "@/components/ui/toast";
import { useCommand } from "@/features/keybindings";
import {
  finishDebugReview,
  toggleDebugRecording,
  useDebugRecorder,
} from "../recorder";
import { DebugPlayer } from "./debug-player";
import { RecordingButton } from "./recording-button";

/**
 * Bug recording around the app: its shortcut, the camera while filming and
 * the player after. Goes once in the app shell.
 */
export function DebugRecorderHost() {
  const t = useTranslations("debugRecorder");
  const queryClient = useQueryClient();
  const recording = useDebugRecorder((s) => s.recording);
  const status = useDebugRecorder((s) => s.status);
  const failed = useDebugRecorder((s) => s.failed);

  useCommand("app.recordBug", () => toggleDebugRecording(queryClient));

  React.useEffect(() => {
    if (!failed) return;
    toast.error(t("startFailed"));
    useDebugRecorder.setState({ failed: false });
  }, [failed, t]);

  return (
    <>
      <RecordingButton />
      {status === "reviewing" && recording && (
        <DebugPlayer recording={recording} onDone={finishDebugReview} />
      )}
    </>
  );
}
