"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Toaster } from "@/components/ui/toast";
import { SecondFactorReminder } from "@/features/auth/components/second-factor-reminder";
import { DebugRecorderHost } from "@/features/debug-recorder";
import { useCommands, useContextKey } from "@/features/keybindings";
import { usePreferencesStore } from "@/features/preferences";
import { useOnlineStatus, useSync, useWarnWhenUnsaved } from "@/features/sync";
import { useTrackPageChanges } from "@/lib/app-history";
import { findNewNoteButton, rememberNewNoteButton } from "@/lib/morph";
import { cn } from "@/lib/utils";
import { PageTransition } from "./page-transition";
import { useShellStore } from "./shell-store";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { newNoteHref, Sidebar } from "./sidebar";
import { MAIN_ID, SkipLink } from "./skip-link";
import { TagJump } from "./tag-jump";

/** The page, for when clauses: notes, archive, trash, settings, note… */
function viewOf(pathname: string) {
  if (/^\/notes\/[^/]+/.test(pathname)) return "note";
  return pathname.split("/")[1] || "notes";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useSync();
  useOnlineStatus();
  useWarnWhenUnsaved();
  useTrackPageChanges();
  const router = useRouter();
  const folded = usePreferencesStore((s) => s.ui.sidebarCollapsed);
  const setUI = usePreferencesStore((s) => s.setUIPreference);
  const {
    drawerOpen,
    setDrawer,
    barShown,
    shortcutsOpen,
    setShortcuts,
    tagJumpOpen,
    setTagJump,
  } = useShellStore();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const drawerOpener = React.useRef<HTMLElement | null>(null);
  const pathname = usePathname() ?? "";
  useContextKey("view", viewOf(pathname));

  const startNote = React.useCallback(() => {
    rememberNewNoteButton(findNewNoteButton());
    const { pathname, search } = window.location;
    router.push(
      newNoteHref(pathname, new URLSearchParams(search).get("tagId")),
    );
  }, [router]);
  useCommands({
    "app.newNote": startNote,
    // Where there is no search field; SearchField takes the key itself.
    "app.search": () => {
      const field = document.querySelector<HTMLInputElement>(
        "main input[type=search]",
      );
      if (field) {
        field.focus();
        field.select();
      } else router.push("/notes?search");
    },
    "app.goToNotes": () => router.push("/notes"),
    "app.goToArchive": () => router.push("/archive"),
    "app.goToTrash": () => router.push("/trash"),
    "app.goToSettings": () => router.push("/settings"),
    "app.goToTag": () => setTagJump(true),
    "app.showShortcuts": () => setShortcuts(true),
    "app.openKeybindings": () => router.push("/settings/shortcuts"),
    "app.toggleSidebar": () =>
      setUI(
        "sidebarCollapsed",
        !usePreferencesStore.getState().ui.sidebarCollapsed,
      ),
  });
  // The desktop app's shortcut from anywhere on the computer.
  React.useEffect(() => {
    window.addEventListener("anchor:new-note", startNote);
    return () => window.removeEventListener("anchor:new-note", startNote);
  }, [startNote]);

  return (
    <div
      data-slot="app-shell"
      className="flex h-dvh overflow-hidden bg-background text-foreground"
    >
      <SkipLink />
      <div className="hidden min-h-0 lg:flex">
        <Sidebar
          folded={folded}
          onToggleFold={() => setUI("sidebarCollapsed", !folded)}
        />
      </div>
      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawer}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-scrim) bg-overlay animate-fade-in data-[state=closed]:pointer-events-none! data-[state=closed]:animate-fade-out lg:hidden" />
          <DialogPrimitive.Content
            ref={drawerRef}
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              drawerOpener.current = document.activeElement as HTMLElement;
              const drawer = drawerRef.current;
              const current = drawer?.querySelector<HTMLElement>(
                "a[aria-current=page]",
              );
              (current ?? drawer)?.focus();
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              const opener = drawerOpener.current;
              drawerOpener.current = null;
              if (opener?.isConnected) opener.focus();
            }}
            className="fixed inset-y-0 left-0 z-(--z-drawer) flex overflow-hidden rounded-r-3xl shadow-menu outline-none animate-drawer-in data-[state=closed]:pointer-events-none! data-[state=closed]:animate-drawer-out lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">
              Menu
            </DialogPrimitive.Title>
            <Sidebar drawer onNavigate={() => setDrawer(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="relative flex min-w-0 flex-1 flex-col outline-none"
      >
        <SecondFactorReminder />
        <PageTransition>{children}</PageTransition>
        <Toaster className={cn(barShown && "bottom-20")} />
      </main>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcuts} />
      <TagJump open={tagJumpOpen} onOpenChange={setTagJump} />
      <DebugRecorderHost />
    </div>
  );
}
