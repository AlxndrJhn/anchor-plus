// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedNote, updateSharedNote } from "@/features/notes/api";
import type { SharedNote } from "@/features/notes/types";
import { WithIntl } from "@/lib/i18n/test-utils";
import SharedNotePage from "./shared-note-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/s/tok",
}));
vi.mock("@/features/notes/api", () => ({
  fetchAttachmentBlob: vi.fn(),
  getSharedNote: vi.fn(),
  setAttachmentLink: vi.fn(),
  updateSharedNote: vi.fn(),
}));
vi.mock("@/components/layout/brand", () => ({ Brand: () => null }));
vi.mock("@/features/notes/hooks/use-attachment-blob", () => ({
  useAttachmentBlob: () => ({ blobUrl: null }),
}));
// A plain box in place of the rich editor: these tests are about saving.
vi.mock("@/features/notes/components/editor", () => ({
  RichTextEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (next: string) => void;
  }) => (
    <textarea
      aria-label="Body"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const note = (version: number, content: string): SharedNote =>
  ({
    title: "Groceries",
    content,
    background: null,
    version,
    updatedAt: "2026-11-08T00:00:00.000Z",
    isFrozen: false,
    permission: "editor",
    canEdit: true,
    attachments: [],
  }) as unknown as SharedNote;

let root: Root | null = null;
let client: QueryClient;

const body = () =>
  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Body"]');

async function open() {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <WithIntl>
        <QueryClientProvider client={client}>
          <SharedNotePage />
        </QueryClientProvider>
      </WithIntl>,
    );
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function type(text: string) {
  const box = body();
  if (!box) throw new Error("The note isn't open");
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  await act(async () => {
    setValue?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const pass = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(getSharedNote).mockResolvedValue(note(1, "milk"));
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  client.clear();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("saving on a share link page", () => {
  it("saves soon after typing stops", async () => {
    vi.mocked(updateSharedNote).mockResolvedValue(note(2, "milk and eggs"));
    await open();

    await type("milk and eggs");
    await pass(700);
    expect(updateSharedNote).not.toHaveBeenCalled();

    await pass(100);
    expect(updateSharedNote).toHaveBeenCalledTimes(1);
    expect(updateSharedNote).toHaveBeenCalledWith("tok", {
      content: "milk and eggs",
      baseVersion: 1,
    });
  });

  it("typing without a pause still saves every two seconds", async () => {
    vi.mocked(updateSharedNote).mockImplementation(async (_, dto) =>
      note((dto.baseVersion ?? 0) + 1, dto.content ?? ""),
    );
    await open();

    await type("e");
    await pass(500);
    await type("eg");
    await pass(500);
    await type("egg");
    await pass(500);
    await type("eggs");
    await pass(499);
    expect(updateSharedNote).not.toHaveBeenCalled();

    await pass(1);
    expect(updateSharedNote).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSharedNote).mock.calls[0][1].content).toBe("eggs");
  });

  it("a load older than the last save doesn't undo it", async () => {
    let answerLoad: (value: SharedNote) => void = () => {};
    vi.mocked(updateSharedNote).mockResolvedValue(note(2, "milk and eggs"));
    await open();

    // Someone's change makes the page load the note; the answer takes a while.
    vi.mocked(getSharedNote).mockImplementation(
      () =>
        new Promise((resolve) => {
          answerLoad = resolve;
        }),
    );
    await act(async () => {
      void client.refetchQueries({ queryKey: ["shared-note", "tok"] });
    });

    await type("milk and eggs");
    await pass(800);
    expect(body()?.value).toBe("milk and eggs");

    await act(async () => {
      answerLoad(note(1, "milk"));
    });
    await pass(0);
    expect(body()?.value).toBe("milk and eggs");
  });
});

describe("the notices on a share link page", () => {
  it("says where the source is, for visitors without an account", async () => {
    await open();
    const source = [...document.querySelectorAll("a")].find(
      (a) => a.textContent === "Source code",
    );
    expect(source?.href).toContain("github.com/AlxndrJhn/anchor-plus/tree/");
    expect(document.body.textContent).toContain("GNU AGPL");
  });
});
