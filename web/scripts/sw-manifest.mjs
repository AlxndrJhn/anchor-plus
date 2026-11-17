// Lists the build's static files for the service worker (public/sw.js) to
// keep, so every part of the app, even code loaded only when needed, works
// offline. Runs after `next build`, into the exported site (out/); served as
// /_next/static/sw-manifest.json.
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const web = join(import.meta.dirname, "..");
const exported = join(web, "out", "_next", "static");
const dir = existsSync(exported) ? exported : join(web, ".next", "static");

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    const full = join(path, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dir)
  .filter(
    (file) => !file.endsWith("sw-manifest.json") && !file.endsWith(".map"),
  )
  .map((file) => `/_next/static/${relative(dir, file).split(sep).join("/")}`);

writeFileSync(join(dir, "sw-manifest.json"), JSON.stringify(files));
console.log(`sw-manifest.json: ${files.length} files`);
