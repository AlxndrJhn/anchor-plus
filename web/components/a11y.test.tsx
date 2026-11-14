// @vitest-environment jsdom
import axe from "axe-core";
import { Plus } from "lucide-react";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MAIN_ID, SkipLink } from "@/components/layout/skip-link";
import { Button, IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WithIntl } from "@/lib/i18n/test-utils";

// React's act() warns without it.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function render(ui: ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<WithIntl>{ui}</WithIntl>));
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

/** The axe violations on the page, as "rule: element" lines. */
async function violations() {
  const results = await axe.run(document.body, {
    // jsdom has no layout, so colours and sizes can't be measured here; the
    // scheme build checks the colours.
    rules: {
      "color-contrast": { enabled: false },
      "target-size": { enabled: false },
      region: { enabled: false },
    },
  });
  return results.violations.flatMap((v) =>
    v.nodes.map((node) => `${v.id}: ${node.html}`),
  );
}

describe("accessibility (axe)", () => {
  it("buttons and icon buttons have names", async () => {
    await render(
      <>
        <Button>Save</Button>
        <IconButton label="New note">
          <Plus />
        </IconButton>
      </>,
    );
    expect(await violations()).toEqual([]);
  });

  it("a field labels its input and describes it", async () => {
    await render(
      <>
        <Field label="Email" help="We never share it.">
          <Input type="email" />
        </Field>
        <Field label="Password" error="Too short">
          <Input type="password" />
        </Field>
      </>,
    );
    expect(await violations()).toEqual([]);
    const input = document.querySelector("input[type=password]");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
  });

  it("a switch has a name and a state", async () => {
    await render(
      <>
        <label htmlFor="single-keys">Single-key shortcuts</label>
        <Switch id="single-keys" defaultChecked />
      </>,
    );
    expect(await violations()).toEqual([]);
  });

  it("an open menu is a named menu of items", async () => {
    await render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button>Sort</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuItem>Date edited</DropdownMenuItem>
          <DropdownMenuItem>Title</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(document.querySelectorAll("[role=menuitem]")).toHaveLength(2);
    expect(await violations()).toEqual([]);
  });

  it("the skip link comes first and moves focus to the page", async () => {
    await render(
      <>
        <SkipLink />
        <nav aria-label="Sidebar">
          <a href="/notes">Notes</a>
        </nav>
        <main id={MAIN_ID} tabIndex={-1}>
          <h1>Notes</h1>
        </main>
      </>,
    );
    expect(await violations()).toEqual([]);
    const link = document.querySelector<HTMLAnchorElement>("a");
    expect(link?.textContent).toBe("Skip to content");
    act(() => link?.click());
    expect(document.activeElement?.id).toBe(MAIN_ID);
  });
});
