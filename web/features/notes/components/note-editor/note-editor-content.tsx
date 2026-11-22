"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  ChevronDown,
  Globe,
  ImagePlus,
  List,
  ListChecks,
  Mic,
  Paperclip,
  Plus,
  Repeat,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import { LoadFailedRow } from "@/components/ui/empty-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import {
  formatFullDate,
  formatShortDate,
  usePreferencesStore,
} from "@/features/preferences";
import { type Tag, TagChip, TagPicker, useTagOrder } from "@/features/tags";
import { useRovingFocus } from "@/lib/hooks/use-roving-focus";
import { translate } from "@/lib/i18n";
import { useFlip } from "@/lib/use-flip";
import { cn, shortNames } from "@/lib/utils";
import {
  deleteAttachment,
  fetchAttachmentBlob,
  uploadAttachment,
} from "../../api";
import { MAX_ATTACHMENT_SIZE } from "../../constants";
import { stampFor } from "../../date-stamp";
import { inlineImageIds, primeInlineImage } from "../../inline-images";
import { publicLinkLabel } from "../../public-link";
import { deltaToFullPlainText, isContentBlank } from "../../quill";
import { isReminderPast, reminderLabel } from "../../reminder";
import { scanAttachmentIds } from "../../scans";
import type {
  NoteAttachment,
  NoteReminder,
  NoteSharePermission,
  ReminderRecurrence,
} from "../../types";
import {
  AttachmentStrip,
  type AttachmentStripHandle,
  holdAttachment,
} from "../attachments";
import { CameraDialog } from "../attachments/camera-dialog";
import { canRecordAudio, VoiceRecorder } from "../attachments/voice-recorder";
import { RichTextEditor, type RichTextEditorHandle } from "../editor";
import type { InlinePictureHost } from "../editor/inline-image-tools";
import { useRingOnce } from "../reminder-chip";
import { ReminderPopoverContent } from "../reminder-picker";
import { NoteOutline } from "./note-outline";
import { useTitleLine, withoutLineBreaks } from "./use-title-line";

export interface Person {
  id: string;
  name: string;
  profileImage?: string | null;
}

import type { CollabSession } from "../../collab/session";

interface NoteEditorContentProps {
  noteId?: string;
  isNew: boolean;
  readOnly: boolean;
  tagsLocked: boolean;
  canSetReminder: boolean;
  readOnlyBar?: React.ReactNode;
  title: string;
  content: string;
  updatedAt?: string;
  sharedBy?: Person | null;
  sharedWith: Person[];
  /** What anyone with the note's link can do; absent when no link opens it. */
  publicLink?: NoteSharePermission | null;
  tagIds: string[];
  allTags: Tag[];
  tagsLoading: boolean;
  tagsLoadFailed: boolean;
  tagsRetrying: boolean;
  onRetryTags: () => void;
  reminder: NoteReminder | null;
  canUpload: boolean;
  isOwner: boolean;
  currentUserId: string | null;
  titleInputRef: RefObject<HTMLTextAreaElement | null>;
  contentEditorRef: RefObject<RichTextEditorHandle | null>;
  onEnsureNoteIdForAttachmentUpload?: () => Promise<string | null>;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  collab?: CollabSession | null;
  onTagsChange: (tagIds: string[]) => void;
  onCreateTag: (name: string) => Promise<Tag | undefined>;
  onReminder: (
    reminder: { remindAt: string; recurrence: ReminderRecurrence } | null,
  ) => void;
  onReadOnlyAttempt?: () => void;
  /** For the note's Add image, Take picture and Take several. */
  pictureActionsRef?: RefObject<PictureActions | null>;
}

/** Adds pictures to the note as attachments, as its bar's actions do. */
export interface PictureActions {
  /** Opens the file picker, for pictures only. */
  pickPictures: () => void;
  /** Takes a picture with a camera, or several in a row. */
  takePictures: (several: boolean) => void;
}

type ContentT = ReturnType<typeof useTranslations<"noteEditor.content">>;

/** “Sam”, “Sam and Maya”, “Sam, Maya and 2 others”. */
function sharedLine(people: Person[], t: ContentT) {
  const firstNames = shortNames(people.map((person) => person.name));
  return t("people", {
    count: firstNames.length,
    a: firstNames[0],
    b: firstNames[1] ?? "",
    c: firstNames[2] ?? "",
    others: Math.max(0, firstNames.length - 2),
  });
}

/** “Edited today”, “Edited yesterday”, “Edited Sep 22”. */
function editedLine(iso: string, t: ContentT, now = new Date()) {
  const date = new Date(iso);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (daysAgo === 0) return t("editedToday");
  if (daysAgo === 1) return t("editedYesterday");
  return t("edited", {
    date:
      date.getFullYear() === now.getFullYear()
        ? formatShortDate(date)
        : formatFullDate(date),
  });
}

export function NoteEditorContent(props: NoteEditorContentProps) {
  const t = useTranslations("noteEditor.content");
  const root = React.useRef<HTMLDivElement>(null);
  const strip = React.useRef<AttachmentStripHandle>(null);
  const dropping = useFileDrop(root, props.canUpload, (files) =>
    strip.current?.add(files),
  );
  const pictureInput = React.useRef<HTMLInputElement>(null);
  const [camera, setCamera] = React.useState<"one" | "several" | null>(null);
  React.useImperativeHandle(
    props.pictureActionsRef,
    () => ({
      pickPictures: () => pictureInput.current?.click(),
      takePictures: (several) => setCamera(several ? "several" : "one"),
    }),
    [],
  );
  const words = React.useMemo(
    () =>
      deltaToFullPlainText(props.content).trim().split(/\s+/).filter(Boolean)
        .length,
    [props.content],
  );
  const edited = props.updatedAt ? editedLine(props.updatedAt, t) : null;
  const people = props.sharedBy ? [] : props.sharedWith;
  const [hasFiles, setHasFiles] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  // Known only in the browser, so it waits for the first paint.
  const [canRecord, setCanRecord] = React.useState(false);
  React.useEffect(() => setCanRecord(canRecordAudio()), []);
  const record =
    props.canUpload && canRecord ? () => setRecording(true) : undefined;
  const startersRoving = useRovingFocus<HTMLDivElement>();
  const clean = usePreferencesStore((s) => s.editor.noteLayout === "clean");
  const formattingOpen = usePreferencesStore((s) => !!s.editor.formattingOpen);
  const titleLine = useTitleLine(
    props.titleInputRef,
    props.contentEditorRef,
    props.onTitleChange,
  );
  const inTextIds = React.useMemo(
    // Pictures in the text and the photos of scans stay out of the strip.
    () =>
      new Set([
        ...inlineImageIds(props.content),
        ...scanAttachmentIds(props.content),
      ]),
    [props.content],
  );
  const pictures = useInlinePictures(
    props.canUpload,
    props.noteId,
    props.onEnsureNoteIdForAttachmentUpload,
    (id) => strip.current?.view(id),
  );

  const starters = !props.readOnly &&
    !hasFiles &&
    isContentBlank(props.content) && (
      <div
        ref={startersRoving.ref}
        className="em-start"
        role="toolbar"
        aria-label={t("startWith")}
        onFocus={startersRoving.onFocus}
        onKeyDown={startersRoving.onKeyDown}
      >
        <button
          type="button"
          onClick={() =>
            props.contentEditorRef?.current?.startList?.("unchecked")
          }
        >
          <ListChecks aria-hidden />
          {t("checklist")}
        </button>
        <button
          type="button"
          onClick={() => props.contentEditorRef?.current?.startList?.("bullet")}
        >
          <List aria-hidden />
          {t("list")}
        </button>
        {props.canUpload && (
          <button type="button" onClick={() => strip.current?.pick()}>
            <ImagePlus aria-hidden />
            {t("pictureOrAudio")}
          </button>
        )}
        {record && (
          <button type="button" onClick={record}>
            <Mic aria-hidden />
            {t("recordAudio")}
          </button>
        )}
        <span className="hint">
          {t.rich("typeSlash", { kbd: () => <kbd>/</kbd> })}
        </span>
      </div>
    );

  const attachments = (
    <AttachmentStrip
      ref={strip}
      noteId={props.noteId}
      canEdit={props.canUpload}
      isOwner={props.isOwner}
      currentUserId={props.currentUserId}
      onEnsureNoteId={props.onEnsureNoteIdForAttachmentUpload}
      dropping={!!dropping}
      onHasFiles={setHasFiles}
      inTextIds={inTextIds}
      onGrabText={
        props.readOnly
          ? undefined
          : (text) => props.contentEditorRef?.current?.appendText(text)
      }
    />
  );

  const onTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const stamp = stampFor(
      e.nativeEvent,
      usePreferencesStore.getState().editor,
    );
    if (stamp) {
      e.preventDefault();
      const input = e.currentTarget;
      input.setRangeText(
        stamp,
        input.selectionStart ?? input.value.length,
        input.selectionEnd ?? input.value.length,
        "end",
      );
      props.onTitleChange(withoutLineBreaks(input.value));
      return;
    }
    // Tab skips the tag row, attachments and toolbar on the way.
    if (
      e.key === "Tab" &&
      !e.shiftKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      props.contentEditorRef?.current?.setSelection(0, 0);
      return;
    }
    titleLine.onKeyDown(e);
  };

  return (
    <div
      ref={root}
      className="note-in"
      onPasteCapture={(e) => {
        if (!props.canUpload) return;
        const images = pastedImages(e.clipboardData);
        if (!images.length) return;
        // Caught before Quill sees it, or the picture lands in the text.
        e.preventDefault();
        e.stopPropagation();
        // Pasted in the text, the picture goes in at the caret.
        const inText = (e.target as HTMLElement).closest(".ql-editor");
        if (inText && props.contentEditorRef?.current?.pastePictures(images))
          return;
        strip.current?.add(images);
      }}
    >
      {props.readOnlyBar}
      {/* The page's heading while the title is a field (WCAG 1.3.1). */}
      {!props.readOnly && (
        <h1 className="sr-only">{props.title.trim() || t("untitled")}</h1>
      )}
      {props.readOnly ? (
        <h1 className="n-title">{props.title || t("untitled")}</h1>
      ) : clean ? (
        <div className="n-head">
          <TitleField
            ref={props.titleInputRef}
            value={props.title}
            onChange={(title) => props.onTitleChange(withoutLineBreaks(title))}
            onKeyDown={onTitleKeyDown}
            onPaste={titleLine.onPaste}
          />
          <Tip
            label={formattingOpen ? t("hideFormatting") : t("showFormatting")}
          >
            <button
              type="button"
              className="fold-tb"
              aria-label={t("formatting")}
              aria-expanded={formattingOpen}
              onClick={() =>
                usePreferencesStore
                  .getState()
                  .setEditorPreference("formattingOpen", !formattingOpen)
              }
            >
              <ChevronDown aria-hidden />
            </button>
          </Tip>
        </div>
      ) : (
        <TitleField
          ref={props.titleInputRef}
          value={props.title}
          onChange={(title) => props.onTitleChange(withoutLineBreaks(title))}
          onKeyDown={onTitleKeyDown}
          onPaste={titleLine.onPaste}
        />
      )}
      {!props.isNew && (edited || props.sharedBy || people.length > 0) && (
        <div className="meta">
          {edited && <span>{edited}</span>}
          {edited && <span aria-hidden>·</span>}
          <span>{t("words", { count: words })}</span>
          {props.sharedBy && (
            <>
              <span aria-hidden>·</span>
              <span className="who">
                <Avatar
                  id={props.sharedBy.id}
                  name={props.sharedBy.name}
                  src={props.sharedBy.profileImage}
                  size="xs"
                />
                {t("sharedBy", { name: props.sharedBy.name.split(" ")[0] })}
              </span>
            </>
          )}
          {people.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="who">
                <span className="flex -space-x-1.5">
                  {people.slice(0, 3).map((person) => (
                    <Avatar
                      key={person.id}
                      id={person.id}
                      name={person.name}
                      src={person.profileImage}
                      size="xs"
                      ring
                    />
                  ))}
                </span>
                {t("sharedWith", { people: sharedLine(people, t) })}
              </span>
            </>
          )}
          {props.publicLink && (
            <>
              <span aria-hidden>·</span>
              <span className="who">
                <Globe aria-hidden className="size-3.5" />
                {publicLinkLabel(props.publicLink)}
              </span>
            </>
          )}
        </div>
      )}
      {clean && props.reminder && props.canSetReminder && (
        <div className="n-tags">
          <ReminderChip {...props} />
        </div>
      )}
      {!clean && <TagRow {...props} withReminder />}
      {!clean && attachments}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: listens for keys meant for the text inside */}
      <div
        className={cn(
          "ed-body",
          props.readOnly && "mt-4.5",
          clean && !formattingOpen && "tb-folded",
        )}
        onKeyDownCapture={(e) => {
          const typing =
            (e.key.length === 1 ||
              e.key === "Enter" ||
              e.key === "Backspace") &&
            !e.metaKey &&
            !e.ctrlKey &&
            !e.altKey;
          const pasting =
            (e.metaKey || e.ctrlKey) &&
            !e.altKey &&
            e.key.toLowerCase() === "v";
          if (
            props.readOnly &&
            (typing || pasting) &&
            (e.target as HTMLElement).closest(".ql-editor") &&
            !(e.key === "Enter" && (e.target as HTMLElement).closest("a"))
          ) {
            e.preventDefault();
            props.onReadOnlyAttempt?.();
          }
        }}
        onPasteCapture={(e) => {
          if (
            props.readOnly &&
            (e.target as HTMLElement).closest(".ql-editor")
          ) {
            e.preventDefault();
            props.onReadOnlyAttempt?.();
          }
        }}
        onClickCapture={(e) => {
          if (props.readOnly && (e.target as HTMLElement).closest(".ql-ui"))
            props.onReadOnlyAttempt?.();
        }}
        onDoubleClick={(e) => {
          // A picture in the text opens in the viewer, like its tile does.
          const target = e.target as HTMLElement;
          if (target.tagName !== "IMG") return;
          const id = target.closest<HTMLElement>(".note-image")?.dataset.id;
          if (!id) return;
          e.preventDefault();
          strip.current?.view(id);
        }}
      >
        <RichTextEditor
          ref={props.contentEditorRef}
          value={props.content}
          onChange={props.onContentChange}
          collab={props.collab}
          onRemoteContent={props.onContentChange}
          placeholder={props.isNew ? t("startWriting") : t("writeSomething")}
          readOnly={props.readOnly}
          onAddAttachment={
            props.canUpload ? () => strip.current?.pick() : undefined
          }
          onRecordAudio={record}
          below={starters}
          noteId={props.noteId}
          pictures={pictures}
          firstLine={titleLine.firstLine}
        />
      </div>
      {clean && (
        <div className="n-foot">
          <TagRow {...props} withReminder={false} />
          {attachments}
        </div>
      )}
      <NoteOutline root={root} />
      <input
        ref={pictureInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) strip.current?.add(files);
        }}
      />
      <CameraDialog
        open={camera !== null}
        several={camera === "several"}
        onClose={() => setCamera(null)}
        onPicture={(file) => strip.current?.add([file])}
      />
      {recording && (
        <VoiceRecorder
          onRecorded={(file) => strip.current?.add([file])}
          onClose={() => setRecording(false)}
        />
      )}
      {dropping &&
        createPortal(
          <div className="drop-ov" aria-hidden>
            <span className="drop-label">
              <Paperclip />
              {t("dropToAttach")}
            </span>
          </div>,
          dropping,
        )}
    </div>
  );
}

/**
 * Uploads, loads and deletes the pictures placed in the text, keeping the
 * attachment lists up to date, as the strip does for its own.
 */
function useInlinePictures(
  canUpload: boolean,
  noteId: string | undefined,
  ensureNoteId: (() => Promise<string | null>) | undefined,
  view: (id: string) => void,
): InlinePictureHost | undefined {
  const queryClient = useQueryClient();
  const latest = React.useRef({ noteId, ensureNoteId, view });
  latest.current = { noteId, ensureNoteId, view };
  return React.useMemo(() => {
    if (!canUpload) return undefined;
    const listOf = (note: string) => ["attachments", note];
    return {
      upload: async (files) => {
        const { noteId: known, ensureNoteId: ensure } = latest.current;
        const note = known ?? (await ensure?.()) ?? null;
        if (!note) throw new Error("The note isn’t saved");
        const ids: string[] = [];
        for (const file of files) {
          if (file.size > MAX_ATTACHMENT_SIZE) {
            toast.error(
              translate("noteEditor.content")("fileTooLarge", {
                name: file.name,
              }),
            );
            continue;
          }
          const saved = await uploadAttachment(note, file);
          queryClient.setQueryData(["attachment-file", note, saved.id], file);
          queryClient.setQueryData<NoteAttachment[]>(
            listOf(note),
            (list = []) => [saved, ...list.filter((a) => a.id !== saved.id)],
          );
          primeInlineImage(note, saved.id, file);
          ids.push(saved.id);
        }
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        return ids;
      },
      load: (id) => {
        const note = latest.current.noteId;
        if (!note) return Promise.reject(new Error("The note isn’t saved"));
        return queryClient.fetchQuery({
          queryKey: ["attachment-file", note, id],
          queryFn: () => fetchAttachmentBlob(note, id),
          staleTime: Number.POSITIVE_INFINITY,
        });
      },
      remove: (id, done) => {
        const note = latest.current.noteId;
        if (!note) return done?.();
        deleteAttachment(note, id)
          .then(
            () => {
              queryClient.setQueryData<NoteAttachment[]>(listOf(note), (list) =>
                list?.filter((a) => a.id !== id),
              );
              queryClient.invalidateQueries({ queryKey: ["notes"] });
            },
            // Left in the strip, where it can still be deleted.
            () => undefined,
          )
          .finally(done);
      },
      hold: holdAttachment,
      view: (id) => latest.current.view(id),
    };
  }, [canUpload, queryClient]);
}

/** Pictures on the clipboard, named so a pasted screenshot reads well. */
function pastedImages(data: DataTransfer) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return [...data.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .flatMap((item, i) => {
      const file = item.getAsFile();
      if (!file) return [];
      // Browsers name every pasted screenshot “image.png”.
      if (file.name && file.name !== "image.png") return [file];
      const ext = file.type.split("/")[1] ?? "png";
      return [
        new File(
          [file],
          `${translate("noteEditor.content")("pasted", {
            stamp: `${stamp}${i ? `-${i}` : ""}`,
          })}.${ext}`,
          {
            type: file.type,
          },
        ),
      ];
    });
}

const supportsFieldSizing =
  typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

function TitleField({
  ref,
  value,
  onChange,
  onKeyDown,
  onPaste,
}: {
  ref: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onPaste: React.ClipboardEventHandler<HTMLTextAreaElement>;
}) {
  const t = useTranslations("noteEditor.content");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the height follows the text.
  React.useLayoutEffect(() => {
    const field = ref.current;
    if (!field || supportsFieldSizing) return;
    const fitHeight = () => {
      field.style.height = "auto";
      field.style.height = `${field.scrollHeight}px`;
    };
    fitHeight();
    const observer = new ResizeObserver(fitHeight);
    observer.observe(field);
    return () => observer.disconnect();
  }, [ref, value]);

  return (
    <textarea
      ref={ref}
      className="n-title"
      dir="auto"
      rows={1}
      value={value}
      aria-label={t("title")}
      placeholder={t("title")}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  );
}

/** Returns the note while files are over it. */
function useFileDrop(
  root: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  onFiles: (files: File[]) => void,
) {
  const [overNote, setOverNote] = React.useState<HTMLElement | null>(null);
  const onFilesRef = React.useRef(onFiles);
  onFilesRef.current = onFiles;

  React.useEffect(() => {
    const note = root.current?.closest<HTMLElement>(".note");
    if (!note || !enabled) return;
    let depth = 0;
    const carriesFiles = (e: DragEvent) =>
      !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      depth++;
      setOverNote(note);
    };
    const leave = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      if (--depth <= 0) {
        depth = 0;
        setOverNote(null);
      }
    };
    const dragover = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    // Caught before Quill sees it, or the file lands in the text.
    const drop = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      setOverNote(null);
      onFilesRef.current([...(e.dataTransfer?.files ?? [])]);
    };
    note.addEventListener("dragenter", enter, true);
    note.addEventListener("dragleave", leave, true);
    note.addEventListener("dragover", dragover, true);
    note.addEventListener("drop", drop, true);
    return () => {
      note.removeEventListener("dragenter", enter, true);
      note.removeEventListener("dragleave", leave, true);
      note.removeEventListener("dragover", dragover, true);
      note.removeEventListener("drop", drop, true);
      setOverNote(null);
    };
  }, [root, enabled]);

  return overNote;
}

/** The note's reminder, which opens the picker to change it. */
function ReminderChip(props: NoteEditorContentProps) {
  const t = useTranslations("noteEditor.content");
  const [open, setOpen] = React.useState(false);
  const late = !!props.reminder && isReminderPast(props.reminder);
  const ringBell = useRingOnce(
    props.noteId ?? "new",
    late && props.canSetReminder,
  );
  if (!props.reminder) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip label={t("changeReminder")}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-flip="rem"
            className={cn(
              "inline-flex h-chip cursor-pointer items-center gap-1.25 whitespace-nowrap rounded-pill border-0 pr-2 pl-2.25 font-medium text-chip max-md:h-7.5 [&_svg]:size-3",
              late
                ? "bg-[color-mix(in_srgb,var(--late)_var(--mix-late),var(--note-surface))] text-late"
                : "bg-note-surface text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--note-border)_55%,transparent)] hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--note-muted)_45%,transparent)] [&_svg]:text-note-muted",
              ringBell && "[&_svg]:origin-[50%_15%] [&_svg]:animate-bell-ring",
            )}
          >
            {late ? (
              <BellRing aria-hidden />
            ) : props.reminder.recurrence !== "none" ? (
              <Repeat aria-hidden />
            ) : (
              <Bell aria-hidden />
            )}
            {late && <span className="sr-only">{t("late")} </span>}
            {reminderLabel(props.reminder)}
          </button>
        </PopoverTrigger>
      </Tip>
      <ReminderPopoverContent
        align="start"
        reminder={props.reminder}
        onReminder={props.onReminder}
        onClose={() => setOpen(false)}
      />
    </Popover>
  );
}

function TagRow({
  withReminder,
  ...props
}: NoteEditorContentProps & { withReminder: boolean }) {
  const t = useTranslations("noteEditor.content");
  const roving = useRovingFocus<HTMLDivElement>();
  const row = roving.ref;
  const flip = useFlip(row, { pop: true });
  const orderTags = useTagOrder();
  const tags = orderTags(
    props.tagIds.flatMap((id) => props.allTags.find((t) => t.id === id) ?? []),
  );
  const showReminder = withReminder && !!props.reminder && props.canSetReminder;
  const tagsFailed = props.tagsLoadFailed && props.tagIds.length > 0;
  if (props.tagsLocked && !tags.length && !tagsFailed) return null;

  const toggle = (tag: Tag) => {
    flip.prepare();
    props.onTagsChange(
      props.tagIds.includes(tag.id)
        ? props.tagIds.filter((x) => x !== tag.id)
        : [...props.tagIds, tag.id],
    );
  };

  const removeTag = (tag: Tag) => {
    const removeButton = row.current?.querySelector<HTMLElement>(
      `[data-flip="${CSS.escape(tag.id)}"] button`,
    );
    if (removeButton && row.current) {
      const buttons = [...row.current.querySelectorAll<HTMLElement>("button")];
      buttons[buttons.indexOf(removeButton) + 1]?.focus();
    }
    toggle(tag);
  };

  return (
    <div
      ref={row}
      className="n-tags"
      role="toolbar"
      aria-label={t("tags")}
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
    >
      {tagsFailed && (
        <LoadFailedRow
          message={t("tagsFailed")}
          onRetry={props.onRetryTags}
          isRetrying={props.tagsRetrying}
          className="w-full"
        />
      )}
      {tags.map((tag) => (
        <span
          key={tag.id}
          data-flip={tag.id}
          className="inline-flex min-w-0 max-w-full"
        >
          <TagChip
            name={tag.name}
            color={tag.color}
            onRemove={props.tagsLocked ? undefined : () => removeTag(tag)}
            removeLabel={t("removeTag", { name: tag.name })}
          />
        </span>
      ))}
      {showReminder && <ReminderChip {...props} />}
      {!props.tagsLocked && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-flip="add"
              className="inline-flex h-chip cursor-pointer items-center gap-1.5 rounded-pill border-0 bg-transparent px-2.5 text-small text-note-muted hover:bg-note-surface hover:text-foreground max-md:h-7.5 [&_svg]:size-3.5"
            >
              <Plus aria-hidden />
              {t("addTag")}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <TagPicker
              tags={props.allTags}
              loading={props.tagsLoading}
              loadFailed={props.tagsLoadFailed}
              isRetrying={props.tagsRetrying}
              onRetry={props.onRetryTags}
              state={(id) => props.tagIds.includes(id)}
              onToggle={toggle}
              onCreate={async (name) => {
                const created = await props.onCreateTag(name);
                if (created) {
                  flip.prepare();
                  props.onTagsChange([...props.tagIds, created.id]);
                }
                return created;
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
