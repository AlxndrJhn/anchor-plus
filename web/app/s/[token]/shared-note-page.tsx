"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import {
  CircleAlert,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Pencil,
  RotateCw,
  Snowflake,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Delta, { type Op } from "quill-delta";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "@/components/layout/brand";
import { ErrorScreen } from "@/components/layout/error-screen";
import { LegalNotice } from "@/components/layout/legal-notice";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  fetchAttachmentBlob,
  getSharedNote,
  setAttachmentLink,
  updateSharedNote,
} from "@/features/notes/api";
import { CollabSession } from "@/features/notes/collab/session";
import { RichTextEditor } from "@/features/notes/components/editor";
import { EditorSkeleton } from "@/features/notes/components/note-editor/editor-states";
import { useAttachmentBlob } from "@/features/notes/hooks/use-attachment-blob";
import { inlineImageIds } from "@/features/notes/inline-images";
import { parseStoredContent, stringifyDelta } from "@/features/notes/quill";
import type { SharedNote } from "@/features/notes/types";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { isServerless } from "@/lib/local-backend/mode";
import { cn } from "@/lib/utils";

// Long enough typing without a pause still saves this often, for others to see.
const SAVE_MAX_WAIT_MS = 2_000;

const SAVE_DELAY_MS = 800;
// Others' changes arrive over a WebSocket the moment they're saved; without
// one (a proxy that doesn't pass it on, say), the page polls instead.
const REFRESH_MS = 15_000;

type SaveState = "saved" | "saving" | "unsaved" | "failed";

const statusOf = (error: unknown) =>
  error instanceof HTTPError ? error.response.status : null;

/** A note opened by its share link: no account, no sidebar. */
export default function SharedNotePage() {
  const t = useTranslations("auth.sharedNote");
  const { token } = useParams<{ token: string }>();
  const [live, setLive] = useState(false);

  // The note's pictures and files come through the link too.
  useEffect(() => {
    setAttachmentLink(token);
    return () => setAttachmentLink(null);
  }, [token]);

  const query = useQuery({
    queryKey: ["shared-note", token],
    queryFn: () => getSharedNote(token),
    refetchInterval: live ? false : REFRESH_MS,
    refetchOnWindowFocus: true,
  });
  useDocumentTitle(
    query.data
      ? query.data.title?.trim() || t("title")
      : query.isError
        ? t("notAvailable")
        : t("title"),
  );

  if (query.isPending) return <EditorSkeleton />;
  // Also once it was open: the link was turned off or the note trashed.
  if (statusOf(query.error) === 404) return <LinkGone />;
  if (query.isError && !query.data) {
    return (
      <Screen>
        <ErrorScreen
          illustration="broken"
          title={t("loadFailedTitle")}
          text={t("loadFailedText")}
          actions={
            <Button onClick={() => void query.refetch()}>
              <RotateCw aria-hidden />
              {t("tryAgain")}
            </Button>
          }
        />
      </Screen>
    );
  }
  return <SharedNoteEditor token={token} note={query.data} onLive={setLive} />;
}

function SharedNoteEditor({
  token,
  note,
  onLive,
}: {
  token: string;
  note: SharedNote;
  onLive: (isLive: boolean) => void;
}) {
  const t = useTranslations("auth.sharedNote");
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? "");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [gone, setGone] = useState(false);
  // The version edits are based on, and what was last saved or loaded.
  const base = useRef(note);
  const draft = useRef({ title: note.title, content: note.content ?? "" });
  const timer = useRef<number>(undefined);
  const deadline = useRef<number>(undefined);
  const inFlight = useRef(false);
  const [collab, setCollab] = useState<CollabSession | null>(null);
  const collabLive = useRef(false);
  const queued = useRef(false);

  const adopt = (next: SharedNote) => {
    base.current = next;
    draft.current = { title: next.title, content: next.content ?? "" };
    setTitle(next.title);
    setContent(next.content ?? "");
    queryClient.setQueryData(["shared-note", token], next);
  };

  // Others' edits show while this page has none of its own waiting.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a newer copy from the server.
  useEffect(() => {
    // The session's text is newer than any copy loaded, and on screen.
    if (collabLive.current) {
      base.current = {
        ...note,
        title: draft.current.title,
        content: draft.current.content,
      };
      return;
    }
    if (note.version === base.current.version) {
      base.current = note;
      return;
    }
    // A load that began before the last save ended must not undo that save.
    if (note.version < base.current.version) return;
    if (saveState !== "saved" || inFlight.current) return;
    adopt(note);
  }, [note]);

  const save = async () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(deadline.current);
    deadline.current = undefined;
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    const sent = draft.current;
    const prior = base.current;
    if (sent.title === prior.title && sent.content === (prior.content ?? "")) {
      setSaveState("saved");
      return;
    }
    inFlight.current = true;
    setSaveState("saving");
    try {
      const saved = await updateSharedNote(token, {
        ...(sent.title !== prior.title ? { title: sent.title } : {}),
        ...(sent.content !== (prior.content ?? "")
          ? { content: sent.content }
          : {}),
        baseVersion: prior.version,
      });
      base.current = saved;
      queryClient.setQueryData(["shared-note", token], saved);
      const changedSince = draft.current !== sent;
      setSaveState(changedSince ? "unsaved" : "saved");
      if (changedSince) queued.current = true;
    } catch (error) {
      const status = statusOf(error);
      if (status === 409 && error instanceof HTTPError) {
        const { serverNote } = (error.data ?? {}) as {
          serverNote?: SharedNote;
        };
        if (serverNote) adopt(serverNote);
        setSaveState("saved");
        toast.error(t("conflict"));
      } else if (status === 404) {
        setGone(true);
      } else if (status === 403) {
        // The link was made view-only, or the note frozen.
        setSaveState("saved");
        await queryClient.refetchQueries({ queryKey: ["shared-note", token] });
        const now = queryClient.getQueryData<SharedNote>([
          "shared-note",
          token,
        ]);
        if (now) adopt(now);
        toast.error(t("linkChanged"));
      } else {
        setSaveState("failed");
      }
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void save();
      }
    }
  };

  const edit = (next: { title?: string; content?: string }) => {
    draft.current = { ...draft.current, ...next };
    if (next.title !== undefined) setTitle(next.title);
    if (next.content !== undefined) setContent(next.content);
    if (collabLive.current) {
      if (next.title !== undefined) collab?.setMeta({ title: next.title });
      return;
    }
    setSaveState("unsaved");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
    deadline.current ??= window.setTimeout(() => void save(), SAVE_MAX_WAIT_MS);
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  // biome-ignore lint/correctness/useExhaustiveDependencies: one session per link.
  useEffect(() => {
    if (isServerless) return;
    const session = new CollabSession({
      target: { link: token },
      // Edits the page hasn't saved go up first.
      getUnsavedBase: () =>
        draft.current.content !== (base.current.content ?? "")
          ? new Delta(
              parseStoredContent(base.current.content ?? "").ops as Op[],
            )
          : null,
      onLive: (isLive) => {
        collabLive.current = isLive;
        onLive(isLive);
        if (isLive) {
          window.clearTimeout(timer.current);
          window.clearTimeout(deadline.current);
          deadline.current = undefined;
          setSaveState("saved");
          return;
        }
        // The page saves on its own again, from what the server last had.
        void saveRef.current();
      },
      onMeta: ({ title: nextTitle }) => {
        if (nextTitle === undefined) return;
        draft.current = { ...draft.current, title: nextTitle };
        base.current = { ...base.current, title: nextTitle };
        setTitle(nextTitle);
      },
      onPending: (isPending) => setSaveState(isPending ? "saving" : "saved"),
      onSaved: (version) => {
        const server = session.serverDoc;
        base.current = {
          ...base.current,
          version,
          ...(server ? { content: stringifyDelta({ ops: server.ops }) } : {}),
        };
      },
      onChanged: () =>
        void queryClient.invalidateQueries({
          queryKey: ["shared-note", token],
        }),
      onGone: () =>
        void queryClient.invalidateQueries({
          queryKey: ["shared-note", token],
        }),
    });
    setCollab(session);
    return () => {
      void session.close();
      collabLive.current = false;
      onLive(false);
      setCollab(null);
    };
  }, [token]);

  const remoteContent = (next: string) => {
    draft.current = { ...draft.current, content: next };
    setContent(next);
  };

  // Leaving with edits not yet saved asks first.
  useEffect(() => {
    if (saveState === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(deadline.current);
    },
    [],
  );

  const inText = useMemo(() => inlineImageIds(content), [content]);
  const files = note.attachments.filter((a) => !inText.has(a.id));

  if (gone) return <LinkGone />;

  const canEdit = note.canEdit;
  return (
    <div className="pg-editor">
      <article
        className={cn("note ed", !canEdit && "ro")}
        data-note={note.background ?? ""}
        aria-label={t("noteLabel")}
      >
        <div className="ed-scroll scrollbar-slim">
          <header className="ed-head">
            <Brand href="/" />
            <div className="flex items-center gap-3 text-meta text-note-muted [&_svg]:size-3.75">
              {canEdit && <SaveStatus state={saveState} onRetry={save} />}
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-note-surface px-2.5 py-1">
                {note.isFrozen ? (
                  <Snowflake aria-hidden />
                ) : canEdit ? (
                  <Pencil aria-hidden />
                ) : (
                  <Eye aria-hidden />
                )}
                {note.isFrozen
                  ? t("frozen")
                  : canEdit
                    ? t("canEdit")
                    : t("viewOnly")}
              </span>
            </div>
          </header>
          <div className="note-in">
            {canEdit ? (
              <textarea
                className="n-title"
                rows={1}
                value={title}
                aria-label={t("titleLabel")}
                placeholder={t("titleLabel")}
                spellCheck={false}
                onChange={(e) =>
                  edit({ title: e.target.value.replace(/[\r\n]+/g, " ") })
                }
              />
            ) : (
              <h1 className="n-title">{title || t("untitled")}</h1>
            )}
            {files.length > 0 && <SharedFiles token={token} files={files} />}
            <div className={cn("ed-body", !canEdit && "mt-4.5")}>
              <RichTextEditor
                value={content}
                onChange={(next) => edit({ content: next })}
                readOnly={!canEdit}
                noteId={token}
                collab={collab}
                onRemoteContent={remoteContent}
              />
            </div>
            <LegalNotice className="mt-8 pb-4 text-note-muted" />
          </div>
        </div>
      </article>
    </div>
  );
}

function SaveStatus({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  const t = useTranslations("auth.sharedNote");
  if (state === "failed")
    return (
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-late"
        onClick={onRetry}
      >
        <CircleAlert aria-hidden />
        {t("saveFailed")}
      </button>
    );
  return (
    <span role="status" className="inline-flex items-center gap-1.5">
      {state === "saving" && (
        <LoaderCircle aria-hidden className="animate-spin" />
      )}
      {state === "saved"
        ? t("saved")
        : state === "saving"
          ? t("saving")
          : t("edited")}
    </span>
  );
}

function SharedFiles({
  token,
  files,
}: {
  token: string;
  files: SharedNote["attachments"];
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file) =>
        file.type === "image" ? (
          <SharedPicture key={file.id} token={token} file={file} />
        ) : file.type === "audio" ? (
          <SharedAudio key={file.id} token={token} file={file} />
        ) : (
          <SharedFile key={file.id} token={token} file={file} />
        ),
      )}
    </div>
  );
}

type SharedAttachment = SharedNote["attachments"][number];

function SharedPicture({
  token,
  file,
}: {
  token: string;
  file: SharedAttachment;
}) {
  const { blobUrl } = useAttachmentBlob(token, file.id);
  return (
    <a
      href={blobUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="block size-32 overflow-hidden rounded-lg bg-note-surface"
    >
      {blobUrl && (
        <img
          src={blobUrl}
          alt={file.originalFilename}
          className="size-full object-cover"
        />
      )}
    </a>
  );
}

function SharedAudio({
  token,
  file,
}: {
  token: string;
  file: SharedAttachment;
}) {
  const { blobUrl } = useAttachmentBlob(token, file.id);
  return (
    <audio
      controls
      src={blobUrl ?? undefined}
      aria-label={file.originalFilename}
      className="h-10 max-w-full"
    />
  );
}

function SharedFile({
  token,
  file,
}: {
  token: string;
  file: SharedAttachment;
}) {
  const t = useTranslations("auth.sharedNote");
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const blob = await fetchAttachmentBlob(token, file.id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.originalFilename;
          a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch {
          toast.error(t("downloadFailed", { name: file.originalFilename }));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <LoaderCircle aria-hidden className="animate-spin" />
      ) : (
        <FileText aria-hidden />
      )}
      <span className="max-w-60 truncate">{file.originalFilename}</span>
      <Download aria-hidden />
    </Button>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex p-4">
        <Brand href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center">
        {children}
      </main>
      <footer className="p-4 text-center">
        <LegalNotice />
      </footer>
    </div>
  );
}

function LinkGone() {
  const t = useTranslations("auth.sharedNote");
  return (
    <Screen>
      <ErrorScreen
        illustration="note"
        title={t("goneTitle")}
        text={t("goneText")}
        actions={null}
      />
    </Screen>
  );
}
