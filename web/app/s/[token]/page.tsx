import SharedNotePage from "./shared-note-page";

// One page for every share link: it reads the token from the address, and
// the server (server/src/web-app.ts) hands it out for every /s/<token>. The
// serverless builds have it only so there is one to export.
export function generateStaticParams() {
  return [{ token: "none" }];
}

export default function Page() {
  return <SharedNotePage />;
}
