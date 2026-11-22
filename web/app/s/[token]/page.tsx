import type { Metadata } from "next";
import SharedNotePage from "./shared-note-page";

// The token in the address is the key to the note: search engines leave the
// page out, and links in the note don't pass the address on.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// One page for every share link: it reads the token from the address, and
// the server (server/src/web-app.ts) hands it out for every /s/<token>. The
// serverless builds have it only so there is one to export.
export function generateStaticParams() {
  return [{ token: "none" }];
}

export default function Page() {
  return <SharedNotePage />;
}
