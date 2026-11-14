// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/lib/i18n/test-utils";
import { AuthShell } from "./auth-shell";

vi.mock("@/components/layout/brand", () => ({ Brand: () => null }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  },
);
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
}));

describe("AuthShell", () => {
  it("says where the source is before anyone has an account", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <WithIntl>
          <AuthShell>Sign in</AuthShell>
        </WithIntl>,
      );
    });
    const link = (name: string) =>
      [...host.querySelectorAll("a")].find((a) => a.textContent === name);
    expect(link("Source code")?.href).toContain(
      "github.com/AlxndrJhn/anchor-plus/tree/",
    );
    expect(link("License")?.href).toContain("/LICENSE");
    expect(host.textContent).toContain("GNU AGPL");
    await act(async () => root.unmount());
    host.remove();
  });
});
