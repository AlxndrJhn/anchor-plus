// Finishes a static build (ANCHOR_MODE=local or demo, see next.config.ts)
// for GitHub Pages, which serves it from BASE_PATH:
// - files in public/ that styles and the manifest name by absolute path get
//   the base path;
// - 404.html opens a note's page for /notes/<id>: every note shares the page
//   of /notes/new, which reads the id from the address. Other missing pages,
//   and any page of the demo (a reload starts it over), go to a page that is
//   there.
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const out = join(import.meta.dirname, "..", "out");
const base = process.env.BASE_PATH ?? "";
const mode = process.env.ANCHOR_MODE;

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    const full = join(path, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(join(out, "_next", "static"))) {
  if (!file.endsWith(".css")) continue;
  const css = readFileSync(file, "utf8");
  const fixed = css.replace(/url\((["']?)\/fonts\//g, `url($1${base}/fonts/`);
  if (fixed !== css) writeFileSync(file, fixed);
}

const manifestPath = join(out, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const icon of manifest.icons ?? []) icon.src = `${base}${icon.src}`;
manifest.start_url = `${base}/`;
manifest.scope = `${base}/`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Next.js writes /notes as notes.html beside a notes/ folder of its parts.
// Should GitHub Pages take the folder for the address, it finds the page in
// it too.
for (const file of walk(out)) {
  if (!file.endsWith(".html")) continue;
  const folder = file.slice(0, -".html".length);
  if (existsSync(folder) && statSync(folder).isDirectory())
    copyFileSync(file, join(folder, "index.html"));
}

// The service worker serves a server's pages; these builds don't use it.
rmSync(join(out, "sw.js"), { force: true });

if (mode === "local") {
  // The base goes into an inline <script>: escaped so it can't end the tag.
  const baseLiteral = JSON.stringify(base).replace(
    /[/<>]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  const route = `(function(){var b=${baseLiteral},p=location.pathname.replace(/\\/+$/,"");if(p===b+"/demo"||p.indexOf(b+"/demo/")===0)location.replace(b+"/demo/");else if(!/^\\/notes\\/[^/]+$/.test(p.slice(b.length)))location.replace(b+"/missing");})()`;
  const page = readFileSync(join(out, "notes", "new.html"), "utf8");
  writeFileSync(
    join(out, "404.html"),
    page.replace("<head>", `<head><script>${route}</script>`),
  );
}

console.log(`static site ready in ${out} (${mode}, base "${base}")`);
