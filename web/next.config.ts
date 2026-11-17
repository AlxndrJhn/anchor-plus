import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import packageJson from "./package.json";

// Every production build is a static site: plain files, no Next.js server.
// - A normal build talks to an Anchor server, which serves these files itself
//   (WEB_DIR, see server/src/web-app.ts), so the Docker image runs one Node
//   process instead of two.
// - ANCHOR_MODE=local or demo builds a site that needs no server at all (see
//   lib/local-backend/mode.ts), served from BASE_PATH, e.g. GitHub Pages.
// `next dev` still forwards /api and /uploads to the server at SERVER_URL.
const mode = process.env.ANCHOR_MODE;
const isServerless = mode === "local" || mode === "demo";
const basePath = process.env.BASE_PATH ?? "";
// The Anchor+ release, e.g. 0.17.2.62 for v0.17.2.62, set by
// release.yml; a build outside a release shows the app version.
const appVersion = process.env.ANCHOR_VERSION || packageJson.version;

export default function config(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    ...(isDev ? {} : { output: "export" }),
    images: { unoptimized: true },
    ...(isServerless ? { basePath } : {}),
    env: {
      NEXT_PUBLIC_APP_VERSION: appVersion,
      NEXT_PUBLIC_ANCHOR_MODE: isServerless ? mode : "server",
      NEXT_PUBLIC_BASE_PATH: isServerless ? basePath : "",
    },
    ...(isDev && !isServerless
      ? {
          experimental: {
            // Above the server's 50 MB attachment limit, by the multipart
            // wrapping and then some: a file over the limit reaches the
            // server, which answers 413, instead of being cut off here and
            // failing with a 500.
            proxyClientMaxBodySize: "55mb",
          },
          rewrites: async () => {
            const serverUrl = process.env.SERVER_URL || "http://127.0.0.1:3001";
            return [
              {
                source: "/api/:path*",
                destination: `${serverUrl}/api/:path*`,
              },
              {
                source: "/uploads/:path*",
                destination: `${serverUrl}/uploads/:path*`,
              },
            ];
          },
        }
      : {}),
  };
}
