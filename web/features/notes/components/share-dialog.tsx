"use client";

import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  Globe,
  Link2,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { create } from "zustand";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  menuItem,
} from "@/components/ui/dropdown-menu";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SkeletonRows } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth";
import { copyText } from "@/lib/clipboard";
import { useDelayedFlag } from "@/lib/hooks/use-delayed-flag";
import { isServerless } from "@/lib/local-backend/mode";
import { cn } from "@/lib/utils";
import {
  getNoteShareLink,
  getNoteShares,
  getRecentContacts,
  removeNoteShareLink,
  revokeShare,
  searchUsers,
  setNoteShareLink,
  shareLinkUrl,
  shareNote,
  updateNoteSharePermission,
} from "../api";
import type {
  NoteShare,
  NoteShareLink,
  NoteSharePermission,
  UserSearchResult,
} from "../types";

type AccessText = {
  label: "canView" | "canEdit" | "linkOff";
  icon: React.ReactNode;
  description:
    | "canReadNote"
    | "canChangeTextAndPictures"
    | "linkOffHelp"
    | "linkViewHelp"
    | "linkEditHelp";
};

const ACCESS: Record<NoteSharePermission, AccessText> = {
  viewer: {
    label: "canView",
    icon: <Eye />,
    description: "canReadNote",
  },
  editor: {
    label: "canEdit",
    icon: <Pencil />,
    description: "canChangeTextAndPictures",
  },
};

type LinkAccess = NoteSharePermission | "off";

// What the note's link lets anyone who has it do.
const LINK_ACCESS: Record<LinkAccess, AccessText> = {
  off: {
    label: "linkOff",
    icon: <Lock />,
    description: "linkOffHelp",
  },
  viewer: {
    label: "canView",
    icon: <Eye />,
    description: "linkViewHelp",
  },
  editor: {
    label: "canEdit",
    icon: <Pencil />,
    description: "linkEditHelp",
  },
};

const usePendingRevokes = create<{
  ids: ReadonlySet<string>;
  setPending: (id: string, pending: boolean) => void;
}>((set) => ({
  ids: new Set(),
  setPending: (id, pending) =>
    set((s) => {
      const ids = new Set(s.ids);
      if (pending) ids.add(id);
      else ids.delete(id);
      return { ids };
    }),
}));

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  title?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  noteId,
  title,
}: ShareDialogProps) {
  const t = useTranslations("notes.shareDialog");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const pending = usePendingRevokes((s) => s.ids);
  const setPending = usePendingRevokes((s) => s.setPending);
  const [addedShareId, setAddedShareId] = React.useState<string | null>(null);
  const listOpenRef = React.useRef(false);
  const sharesKey = ["note-shares", noteId];

  const {
    data: shares = [],
    isLoading,
    isLoadingError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: sharesKey,
    queryFn: () => getNoteShares(noteId),
    enabled: open && !!noteId,
  });
  const showLoadingShapes = useDelayedFlag(isLoading);
  const linkKey = ["note-link", noteId];
  const linkQuery = useQuery({
    queryKey: linkKey,
    queryFn: () => getNoteShareLink(noteId),
    enabled: open && !!noteId && !isServerless,
  });
  const link = linkQuery.data ?? null;

  const changeLink = useMutation({
    mutationFn: async (access: LinkAccess) => {
      if (access !== "off") return setNoteShareLink(noteId, access);
      await removeNoteShareLink(noteId);
      return null;
    },
    onSuccess: (next, access) => {
      queryClient.setQueryData<NoteShareLink | null>(linkKey, next);
      // The note's card and page say whether it's public.
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      if (!next) toast.success(t("linkTurnedOff"));
      else if (!link)
        copyText(shareLinkUrl(next.token)).then(
          () => toast.success(t("linkMadeAndCopied")),
          () => toast.success(t("linkMade")),
        );
      else
        toast.success(
          access === "editor" ? t("linkNowEdit") : t("linkNowView"),
        );
    },
    onError: () => toast.error(t("couldNotChangeLink")),
  });
  const visibleShares = shares.filter((s) => !pending.has(s.id));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: sharesKey });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const addPerson = useMutation({
    mutationFn: (user: UserSearchResult) =>
      shareNote(noteId, user.id, "viewer"),
    onSuccess: (share, user) => {
      queryClient.setQueryData<NoteShare[]>(sharesKey, (list = []) => [
        ...list.filter((s) => s.id !== share.id),
        share,
      ]);
      setAddedShareId(share.id);
      refresh();
      toast.success(t("sharedWith", { name: user.name }));
    },
    onError: (_e, user) =>
      toast.error(t("couldNotShareWith", { name: user.name })),
  });

  const changeAccess = useMutation({
    mutationFn: ({
      share,
      permission,
    }: {
      share: NoteShare;
      permission: NoteSharePermission;
    }) => updateNoteSharePermission(noteId, share.id, permission),
    onMutate: ({ share, permission }) => {
      queryClient.setQueryData<NoteShare[]>(sharesKey, (list = []) =>
        list.map((s) => (s.id === share.id ? { ...s, permission } : s)),
      );
    },
    onSuccess: (_s, { share, permission }) => {
      refresh();
      toast.success(
        t(permission === "editor" ? "canNowEdit" : "canNowView", {
          name: share.sharedWithUser.name,
        }),
      );
    },
    onError: (_e, { share }) => {
      refresh();
      toast.error(
        t("couldNotChangeAccess", { name: share.sharedWithUser.name }),
      );
    },
  });

  const removeAccess = (share: NoteShare) => {
    const name = share.sharedWithUser.name;
    setPending(share.id, true);
    toast.success(t("noLongerHasAccess", { name }), {
      undo: () => setPending(share.id, false),
      onClose: () => {
        revokeShare(noteId, share.id).then(
          () => {
            queryClient.setQueryData<NoteShare[]>(sharesKey, (list) =>
              list?.filter((s) => s.id !== share.id),
            );
            setPending(share.id, false);
            refresh();
          },
          () => {
            setPending(share.id, false);
            toast.error(t("couldNotRemoveAccess", { name }));
          },
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        className="md:overflow-visible"
        onEscapeKeyDown={(e) => {
          if (listOpenRef.current) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {title?.trim() ? t("shareTitled", { title }) : t("shareNote")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-3.5">
          <PeopleSearch
            openRef={listOpenRef}
            exclude={
              new Set([
                ...(me ? [me.id] : []),
                ...shares.map((s) => s.sharedWithUser.id),
                ...(addPerson.isPending && addPerson.variables
                  ? [addPerson.variables.id]
                  : []),
              ])
            }
            busy={addPerson.isPending}
            onPick={(user) => addPerson.mutate(user)}
          />
          <div className="mt-1.5 -mb-0.5 text-label text-muted-foreground uppercase">
            {t("peopleWithAccess")}
          </div>
          <div className="-mx-2 grid gap-0.5">
            {me && (
              <Person
                name={me.name}
                you
                email={me.email}
                id={me.id}
                src={me.profileImage}
              >
                <span className="pr-2 text-meta text-muted-foreground">
                  {t("owner")}
                </span>
              </Person>
            )}
            {isLoading ? (
              <SkeletonRows
                count={2}
                className={cn("px-2 py-2.5", !showLoadingShapes && "invisible")}
              />
            ) : isLoadingError ? (
              <LoadFailedRow
                message={t("couldNotLoadPeople")}
                onRetry={() => void refetch()}
                isRetrying={isFetching}
                className="mx-2 mt-1"
              />
            ) : (
              visibleShares.map((share) => (
                <Person
                  key={share.id}
                  id={share.sharedWithUser.id}
                  name={share.sharedWithUser.name}
                  email={share.sharedWithUser.email}
                  src={share.sharedWithUser.profileImage}
                  justAdded={addedShareId === share.id}
                >
                  <AccessMenu
                    share={share}
                    onChange={(permission) =>
                      changeAccess.mutate({ share, permission })
                    }
                    onRemove={() => removeAccess(share)}
                  />
                </Person>
              ))
            )}
          </div>
          {!isServerless && (
            <>
              <div className="mt-1.5 -mb-0.5 text-label text-muted-foreground uppercase">
                {t("link")}
              </div>
              <LinkRow
                link={link}
                loading={linkQuery.isLoading}
                failed={linkQuery.isLoadingError}
                retrying={linkQuery.isFetching}
                onRetry={() => void linkQuery.refetch()}
                busy={changeLink.isPending}
                onChange={(access) => changeLink.mutate(access)}
              />
            </>
          )}
        </DialogBody>
        <DialogFooter className="justify-between">
          <span className="flex items-center gap-2 text-meta text-muted-foreground [&_svg]:size-3.75">
            {link ? <Globe aria-hidden /> : <Lock aria-hidden />}
            {link ? t("anyoneCanOpen") : t("onlyPeopleYouAdd")}
          </span>
          <Button onClick={() => onOpenChange(false)}>{tc("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Person({
  id,
  name,
  email,
  src,
  justAdded,
  you,
  children,
}: {
  id: string;
  name: string;
  email: string;
  src?: string | null;
  justAdded?: boolean;
  you?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("notes.shareDialog");
  return (
    <div
      className={cn(
        "flex min-h-13 items-center gap-3 rounded-lg px-2 py-1.5",
        justAdded && "animate-flash",
      )}
    >
      <Avatar id={id} name={name} src={src} />
      <span className="grid min-w-0 flex-1 leading-[1.3]">
        <b className="truncate font-semibold text-ui">
          {name}
          {you && ` ${t("you")}`}
        </b>
        <small className="truncate text-muted-foreground text-small">
          {email}
        </small>
      </span>
      {children}
    </div>
  );
}

function AccessMenu({
  share,
  onChange,
  onRemove,
}: {
  share: NoteShare;
  onChange: (permission: NoteSharePermission) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("notes.shareDialog");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent pr-2 pl-3 font-medium text-control text-foreground hover:bg-foreground/6 aria-expanded:bg-foreground/6 [&_svg]:size-3.75 [&_svg]:text-muted-foreground"
        >
          {t(ACCESS[share.permission].label)}
          <ChevronDown aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-61"
        aria-label={t("accessFor", { name: share.sharedWithUser.name })}
      >
        <MenuPrimitive.RadioGroup
          value={share.permission}
          onValueChange={(value) =>
            value !== share.permission && onChange(value as NoteSharePermission)
          }
        >
          {(Object.keys(ACCESS) as NoteSharePermission[]).map((permission) => (
            <MenuPrimitive.RadioItem
              key={permission}
              value={permission}
              className={cn(menuItem, "items-start py-2 [&>svg]:mt-0.5")}
            >
              {ACCESS[permission].icon}
              <span className="grid flex-1 gap-0.5 leading-[1.3]">
                {t(ACCESS[permission].label)}
                <small className="whitespace-normal text-muted-foreground text-small">
                  {t(ACCESS[permission].description)}
                </small>
              </span>
              <MenuPrimitive.ItemIndicator className="mt-0.5">
                <Check className="size-4 text-accent-strong" />
              </MenuPrimitive.ItemIndicator>
            </MenuPrimitive.RadioItem>
          ))}
        </MenuPrimitive.RadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger" onSelect={onRemove}>
          <UserMinus />
          {t("removeAccess")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LinkRow({
  link,
  loading,
  failed,
  retrying,
  onRetry,
  busy,
  onChange,
}: {
  link: NoteShareLink | null;
  loading: boolean;
  failed: boolean;
  retrying: boolean;
  onRetry: () => void;
  busy: boolean;
  onChange: (access: LinkAccess) => void;
}) {
  const t = useTranslations("notes.shareDialog");
  if (failed)
    return (
      <LoadFailedRow
        message={t("couldNotLoadLink")}
        onRetry={onRetry}
        isRetrying={retrying}
        className="mt-1"
      />
    );
  if (loading) return <SkeletonRows count={1} className="py-2.5" />;

  const access: LinkAccess = link?.permission ?? "off";
  const url = link ? shareLinkUrl(link.token) : null;
  return (
    <div className="-mx-2 grid gap-1">
      <div className="flex min-h-13 items-center gap-3 rounded-lg px-2 py-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/6 text-muted-foreground [&_svg]:size-4">
          {link ? <Globe aria-hidden /> : <Link2 aria-hidden />}
        </span>
        <span className="grid min-w-0 flex-1 leading-[1.3]">
          <b className="truncate font-semibold text-ui">
            {t("anyoneWithLink")}
          </b>
          <small className="truncate text-muted-foreground text-small">
            {t(LINK_ACCESS[access].description)}
          </small>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={busy}>
            <button
              type="button"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent pr-2 pl-3 font-medium text-control text-foreground hover:bg-foreground/6 disabled:cursor-default disabled:opacity-60 aria-expanded:bg-foreground/6 [&_svg]:size-3.75 [&_svg]:text-muted-foreground"
            >
              {busy && <LoaderCircle aria-hidden className="animate-spin" />}
              {t(LINK_ACCESS[access].label)}
              <ChevronDown aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-61"
            aria-label={t("accessWithLink")}
          >
            <MenuPrimitive.RadioGroup
              value={access}
              onValueChange={(value) =>
                value !== access && onChange(value as LinkAccess)
              }
            >
              {(Object.keys(LINK_ACCESS) as LinkAccess[]).map((option) => (
                <MenuPrimitive.RadioItem
                  key={option}
                  value={option}
                  className={cn(menuItem, "items-start py-2 [&>svg]:mt-0.5")}
                >
                  {LINK_ACCESS[option].icon}
                  <span className="grid flex-1 gap-0.5 leading-[1.3]">
                    {t(LINK_ACCESS[option].label)}
                    <small className="whitespace-normal text-muted-foreground text-small">
                      {t(LINK_ACCESS[option].description)}
                    </small>
                  </span>
                  <MenuPrimitive.ItemIndicator className="mt-0.5">
                    <Check className="size-4 text-accent-strong" />
                  </MenuPrimitive.ItemIndicator>
                </MenuPrimitive.RadioItem>
              ))}
            </MenuPrimitive.RadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {url && (
        <div className="flex items-center gap-2 px-2">
          <Input
            readOnly
            value={url}
            aria-label={t("noteLink")}
            boxClassName="h-9 min-w-0 flex-1"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            variant="secondary"
            onClick={() =>
              copyText(url).then(
                () => toast.success(t("linkCopied")),
                () => toast.error(t("couldNotCopyLink")),
              )
            }
          >
            <Copy aria-hidden />
            {t("copyLink")}
          </Button>
        </div>
      )}
    </div>
  );
}

function PeopleSearch({
  openRef,
  exclude,
  busy,
  onPick,
}: {
  openRef: React.RefObject<boolean>;
  exclude: ReadonlySet<string>;
  busy: boolean;
  onPick: (user: UserSearchResult) => void;
}) {
  const t = useTranslations("notes.shareDialog");
  const [query, setQuery] = React.useState("");
  const [listWanted, setListWanted] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [usingKeyboard, setUsingKeyboard] = React.useState(false);
  const [results, setResults] = React.useState<UserSearchResult[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const listId = React.useId();
  const term = query.trim();

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-contacts"],
    queryFn: getRecentContacts,
  });

  React.useEffect(() => {
    if (term.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let live = true;
    const timer = window.setTimeout(() => {
      searchUsers(term)
        .then(
          (people) => live && setResults(people),
          () => live && setResults([]),
        )
        .finally(() => live && setSearching(false));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [term]);

  const hasTerm = term.length >= 2;
  const options = (hasTerm ? (results ?? []) : recent).filter(
    (u) => !exclude.has(u.id),
  );
  const highlighted = Math.min(activeIndex, Math.max(0, options.length - 1));
  const noMatches =
    hasTerm && results !== null && !searching && !options.length;
  const listShown = listWanted && (options.length > 0 || noMatches);
  openRef.current = listShown;

  // `busy` only turns true on the next render.
  const isPickingRef = React.useRef(false);
  React.useEffect(() => {
    if (!busy) isPickingRef.current = false;
  }, [busy]);

  const pick = (user: UserSearchResult) => {
    if (busy || isPickingRef.current) return;
    isPickingRef.current = true;
    onPick(user);
    setQuery("");
    setActiveIndex(0);
  };

  return (
    <div className="relative">
      <Input
        icon={
          searching || busy ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <UserPlus aria-hidden />
          )
        }
        role="combobox"
        aria-label={t("addPeople")}
        aria-expanded={listShown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          listShown && options.length ? `${listId}-${highlighted}` : undefined
        }
        placeholder={t("addPeople")}
        autoComplete="off"
        value={query}
        boxClassName="h-10.5"
        onPointerDown={() => setListWanted(true)}
        onBlur={() => setListWanted(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setListWanted(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setUsingKeyboard(true);
            if (!listWanted) return setListWanted(true);
            if (options.length)
              setActiveIndex(
                (highlighted +
                  (e.key === "ArrowDown" ? 1 : -1) +
                  options.length) %
                  options.length,
              );
          } else if (e.key === "Enter" && listShown && options[highlighted]) {
            e.preventDefault();
            pick(options[highlighted]);
          } else if (e.key === "Escape" && listShown) {
            setListWanted(false);
          }
        }}
      />
      {listShown && (
        <div
          role="listbox"
          id={listId}
          aria-label={t("people")}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-(--z-popover) grid max-h-70 gap-px overflow-auto rounded-popover bg-card p-1.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border)_70%,transparent),var(--sh-menu)] animate-pop-in"
          onMouseDown={(e) => e.preventDefault()}
        >
          {noMatches ? (
            <div className="px-2.5 py-3.5 text-center text-control text-muted-foreground">
              {t("noOneFound", { term })}
            </div>
          ) : (
            <>
              {!hasTerm && (
                <div className="px-2.5 pt-2 pb-1 text-label text-muted-foreground uppercase">
                  {t("recentlySharedWith")}
                </div>
              )}
              {options.map((user, i) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: the search field drives the list by aria-activedescendant
                <div
                  key={user.id}
                  id={`${listId}-${i}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={i === highlighted}
                  data-kbd={(usingKeyboard && i === highlighted) || undefined}
                  onPointerMove={() => {
                    setUsingKeyboard(false);
                    setActiveIndex(i);
                  }}
                  onClick={() => pick(user)}
                  className="relative flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 aria-selected:bg-foreground/6 data-kbd:after:absolute data-kbd:after:top-1/2 data-kbd:after:left-0.75 data-kbd:after:-mt-2 data-kbd:after:h-4 data-kbd:after:w-0.75 data-kbd:after:rounded-xs data-kbd:after:bg-accent-strong data-kbd:after:content-['']"
                >
                  <Avatar
                    id={user.id}
                    name={user.name}
                    src={user.profileImage}
                  />
                  <span className="grid min-w-0 flex-1 leading-[1.3]">
                    <b className="truncate font-semibold text-ui">
                      {user.name}
                    </b>
                    <small className="truncate text-muted-foreground text-small">
                      {user.email}
                    </small>
                  </span>
                  <Plus aria-hidden className="size-4 text-muted-foreground" />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
