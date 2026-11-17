import NoteEditorPage from "./note-page";

// The static build has one page for every note: it reads the note's id from
// the address. The server (server/src/web-app.ts) and the serverless builds'
// 404.html hand it out for every /notes/<id>.
export function generateStaticParams() {
  return [{ id: "new" }];
}

export default function Page() {
  return <NoteEditorPage />;
}
