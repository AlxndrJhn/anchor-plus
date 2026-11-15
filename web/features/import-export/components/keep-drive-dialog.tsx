"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  ExternalLink,
  FolderOpen,
  TriangleAlert,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { plural } from "@/lib/utils";
import {
  getKeepImportJob,
  type KeepDriveConfig,
  type KeepImportJob,
  startKeepDriveImport,
} from "../api";
import { KEEP_TAKEOUT_URL, pickTakeoutFromDrive } from "../google-drive-picker";

interface KeepDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: Extract<KeepDriveConfig, { enabled: true }>;
}

const POLL_MS = 1000;

const formatBytes = (bytes: number) =>
  bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;

function progressLabel(job: KeepImportJob) {
  switch (job.phase) {
    case "downloading":
      return `Fetching the export from Google Drive, ${formatBytes(job.done)} of ${formatBytes(job.total)}`;
    case "reading":
      return "Reading the export";
    case "notes":
      return `Importing notes ${job.done} of ${job.total}`;
    default:
      return `Importing pictures and recordings ${job.done} of ${job.total}`;
  }
}

/**
 * Moving notes straight from Google Keep: Takeout puts the export in the
 * person's Drive, they pick it here, and this server fetches and imports it,
 * so nothing large goes through their device.
 */
export function KeepDriveDialog({
  open,
  onOpenChange,
  config,
}: KeepDriveDialogProps) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [job, setJob] = React.useState<KeepImportJob | null>(null);
  const running = !!job && job.phase !== "done" && job.phase !== "failed";

  React.useEffect(() => {
    if (!job || !running) return;
    const timer = setTimeout(() => {
      getKeepImportJob(job.id).then(setJob, (err: Error) => {
        setError(err.message);
        setJob(null);
      });
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [job, running]);

  React.useEffect(() => {
    if (job?.phase === "done") {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  }, [job?.phase, queryClient]);

  const close = (next: boolean) => {
    if (!next && running) return;
    if (!next) {
      setJob(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const choose = async () => {
    setError(null);
    setPicking(true);
    try {
      const picked = await pickTakeoutFromDrive(config);
      if (!picked) return;
      const { jobId } = await startKeepDriveImport(
        picked.fileIds,
        picked.accessToken,
      );
      setJob({
        id: jobId,
        phase: "downloading",
        done: 0,
        total: 0,
        notesCreated: 0,
        attachmentsImported: 0,
        skipped: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPicking(false);
    }
  };

  const finished = job?.phase === "done" || job?.phase === "failed";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        size="md"
        showClose={!running}
        onEscapeKeyDown={(e) => running && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Move from Google Keep</DialogTitle>
          <DialogDescription>
            Your notes, checklists, labels, colors, pictures and recordings come
            along. This server fetches them from your Google Drive.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-4">
          {!job && (
            <ol className="m-0 grid list-none gap-4 p-0">
              <Step number={1} title="Export Keep to your Google Drive">
                <p>
                  Google Takeout opens with only Keep selected. Click{" "}
                  <b>Next step</b>, choose <b>Add to Drive</b> as the
                  destination, then <b>Create export</b>. Google emails you when
                  it is ready, usually within minutes.
                </p>
                <Button variant="secondary" asChild>
                  <a href={KEEP_TAKEOUT_URL} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden />
                    Open Google Takeout
                  </a>
                </Button>
              </Step>
              <Step number={2} title="Choose the export">
                <p>
                  Sign in to Google and pick the ZIP in the Takeout folder of
                  your Drive. If it came in several parts, pick them all.
                  Anchor+ can only see the files you pick.
                </p>
                <Button onClick={choose} disabled={picking}>
                  <FolderOpen aria-hidden />
                  {picking ? "Waiting for Google…" : "Choose in Google Drive"}
                </Button>
              </Step>
            </ol>
          )}

          {job && running && <Progress job={job} />}
          {job && finished && <Result job={job} />}
          {error && <FieldError>{error}</FieldError>}
        </DialogBody>
        <DialogFooter>
          {!running && (
            <Button
              variant={finished ? "primary" : "quiet"}
              onClick={() => close(false)}
            >
              {finished ? "Done" : "Cancel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-x-3 gap-y-2 text-ui">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full bg-muted font-semibold text-meta tabular-nums"
      >
        {number}
      </span>
      <b className="self-center font-semibold">{title}</b>
      <div className="col-start-2 grid justify-items-start gap-2.5 text-muted-foreground">
        {children}
      </div>
    </li>
  );
}

function Progress({ job }: { job: KeepImportJob }) {
  const percent = job.total ? (job.done / job.total) * 100 : 0;
  return (
    <div className="grid gap-2">
      <div className="flex justify-between gap-3 font-medium text-control tabular-nums">
        <span>{progressLabel(job)}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Import from Google Keep"
        aria-valuemin={0}
        aria-valuemax={job.total}
        aria-valuenow={job.done}
        className="h-1.5 overflow-hidden rounded-xs bg-muted"
      >
        <div
          className="h-full rounded-xs bg-accent-strong transition-[width] duration-(--duration-slow) ease-standard"
          style={{ width: `${percent}%` }}
        />
      </div>
      <FieldDescription>
        The server keeps going if you close this tab.
      </FieldDescription>
    </div>
  );
}

function Result({ job }: { job: KeepImportJob }) {
  const failed = job.phase === "failed";
  const Icon = failed
    ? CircleAlert
    : job.skipped.length
      ? TriangleAlert
      : CircleCheck;
  return (
    <>
      <div className="flex items-center gap-2.5 font-semibold text-lead [&>svg]:size-5.5">
        <Icon
          aria-hidden
          className={
            failed
              ? "text-destructive"
              : job.skipped.length
                ? "text-warn-foreground"
                : "text-added-ink"
          }
        />
        {failed && !job.notesCreated
          ? "Nothing was imported"
          : `${plural(job.notesCreated, "note")} and ${plural(job.attachmentsImported, "file")} imported`}
      </div>
      {job.error && <FieldError>{job.error}</FieldError>}
      {job.skipped.length > 0 && (
        <details className="rounded-lg bg-warn text-meta text-warn-foreground">
          <summary className="cursor-pointer px-3 py-2.5 font-semibold">
            {plural(job.skipped.length, "item")} left behind
          </summary>
          <ul className="m-0 grid max-h-44 gap-1 overflow-auto pr-3 pb-2.5 pl-8">
            {job.skipped.map((entry, i) => (
              <li key={i} className="wrap-break-word">
                <b className="font-semibold">{entry.item}</b>: {entry.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
