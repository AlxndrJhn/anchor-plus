// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreferencesStore } from "@/features/preferences";
import type { CommandId } from "./commands";
import {
  commandForKey,
  resetDispatcher,
  useCommands,
  useContextKey,
} from "./dispatcher";
import { useKeybindingsStore } from "./store";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

function Harness({
  map,
  context = {},
}: {
  map: Partial<Record<CommandId, () => unknown>>;
  context?: Record<string, boolean | string>;
}) {
  useCommands(map);
  // biome-ignore lint/correctness/useHookAtTopLevel: the keys are fixed per test
  for (const [key, value] of Object.entries(context)) useContextKey(key, value);
  return null;
}

function mount(element: React.ReactElement) {
  act(() => root.render(element));
}

function key(
  code: string,
  k: string,
  mods: KeyboardEventInit = {},
  target: EventTarget = document.body,
) {
  const e = new KeyboardEvent("keydown", {
    code,
    key: k,
    bubbles: true,
    cancelable: true,
    ...mods,
  });
  target.dispatchEvent(e);
  return e;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  useKeybindingsStore.setState({ rules: [] });
  usePreferencesStore
    .getState()
    .setEditorPreference("singleKeyShortcuts", true);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  resetDispatcher();
});

describe("the dispatcher", () => {
  it("runs a command from its default key and stops the key", () => {
    const newNote = vi.fn();
    mount(<Harness map={{ "app.newNote": newNote }} />);
    const e = key("KeyN", "n");
    expect(newNote).toHaveBeenCalledOnce();
    expect(e.defaultPrevented).toBe(true);
  });

  it("leaves a plain key to a text field, but not Ctrl+K", () => {
    const newNote = vi.fn();
    const search = vi.fn();
    mount(<Harness map={{ "app.newNote": newNote, "app.search": search }} />);
    const input = document.createElement("input");
    document.body.append(input);
    key("KeyN", "n", {}, input);
    key("KeyK", "k", { ctrlKey: true }, input);
    expect(newNote).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledOnce();
  });

  it("does nothing under an open dialog", () => {
    const newNote = vi.fn();
    mount(<Harness map={{ "app.newNote": newNote }} />);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    key("KeyN", "n");
    expect(newNote).not.toHaveBeenCalled();
  });

  it("leaves characters alone with single-key shortcuts off", () => {
    const newNote = vi.fn();
    const sidebar = vi.fn();
    mount(
      <Harness
        map={{ "app.newNote": newNote, "app.toggleSidebar": sidebar }}
      />,
    );
    usePreferencesStore
      .getState()
      .setEditorPreference("singleKeyShortcuts", false);
    key("KeyN", "n");
    key("Backslash", "\\", { ctrlKey: true });
    expect(newNote).not.toHaveBeenCalled();
    expect(sidebar).toHaveBeenCalledOnce();
  });

  it("runs a chord, not its second key alone", () => {
    const notes = vi.fn();
    const archive = vi.fn();
    const newNote = vi.fn();
    mount(
      <Harness
        map={{
          "app.goToNotes": notes,
          "app.goToArchive": archive,
          "app.newNote": newNote,
        }}
      />,
    );
    const g = key("KeyG", "g");
    expect(g.defaultPrevented).toBe(true);
    key("KeyN", "n");
    expect(notes).toHaveBeenCalledOnce();
    expect(newNote).not.toHaveBeenCalled();
    key("KeyN", "n");
    expect(newNote).toHaveBeenCalledOnce();
  });

  it("follows when clauses and context keys", () => {
    const leaveTag = vi.fn();
    const clear = vi.fn();
    mount(
      <Harness
        map={{ "list.leaveTag": leaveTag, "list.clearSearch": clear }}
        context={{ inTag: true, searching: true }}
      />,
    );
    key("Escape", "Escape");
    expect(clear).toHaveBeenCalledOnce();
    expect(leaveTag).not.toHaveBeenCalled();
    mount(
      <Harness
        map={{ "list.leaveTag": leaveTag, "list.clearSearch": clear }}
        context={{ inTag: true, searching: false }}
      />,
    );
    key("Escape", "Escape");
    expect(leaveTag).toHaveBeenCalledOnce();
  });

  it("takes the user's keys over the defaults", () => {
    const newNote = vi.fn();
    useKeybindingsStore.setState({
      rules: [
        { key: "n", command: "-app.newNote" },
        { key: "alt+n", command: "app.newNote" },
      ],
    });
    mount(<Harness map={{ "app.newNote": newNote }} />);
    key("KeyN", "n");
    expect(newNote).not.toHaveBeenCalled();
    key("KeyN", "n", { altKey: true });
    expect(newNote).toHaveBeenCalledOnce();
  });

  it("lets the next rule run when a command can't", () => {
    const insertLink = vi.fn(() => false);
    const search = vi.fn();
    mount(
      <Harness
        map={{ "editor.insertLink": insertLink, "app.search": search }}
      />,
    );
    const editor = document.createElement("div");
    editor.className = "ql-editor";
    editor.setAttribute("contenteditable", "true");
    document.body.append(editor);
    key("KeyK", "k", { ctrlKey: true }, editor);
    expect(insertLink).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledOnce();
  });

  it("runs Ctrl+Enter in a note before the focused field sees it", () => {
    const close = vi.fn();
    mount(
      <Harness map={{ "note.close": close }} context={{ noteOpen: true }} />,
    );
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    const quill = vi.fn();
    editor.addEventListener("keydown", quill);
    document.body.append(editor);
    key("Enter", "Enter", { ctrlKey: true }, editor);
    expect(close).toHaveBeenCalledOnce();
    expect(quill).not.toHaveBeenCalled();
  });

  it("tells an element's own handler which command a key asks for", () => {
    mount(<Harness map={{}} />);
    let found: string | null = null;
    const card = document.createElement("a");
    card.className = "nc-link";
    card.tabIndex = 0;
    card.addEventListener("keydown", (e) => {
      found = commandForKey(e, ["list.focusDown", "list.togglePin"], {
        cardFocus: true,
      });
    });
    document.body.append(card);
    key("KeyJ", "j", {}, card);
    expect(found).toBe("list.focusDown");
    key("KeyF", "f", {}, card);
    expect(found).toBe("list.togglePin");
    key("KeyQ", "q", {}, card);
    expect(found).toBeNull();
  });
});
