import { DemoStart } from "@/components/demo/demo-start";
import { demoBySlug, demos } from "@/lib/demo/demos";
import { isDemo } from "@/lib/local-backend/mode";
import MissingPage from "./missing-page";

// The static build needs one, served for every unknown address (by the
// server, or as GitHub Pages' 404.html). The demo build also has a page per
// feature demo, e.g. /freeze.
export function generateStaticParams() {
  return [
    { missing: ["missing"] },
    ...(isDemo ? demos.map((demo) => ({ missing: [demo.slug] })) : []),
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ missing: string[] }>;
}) {
  const { missing } = await params;
  const demo =
    isDemo && missing.length === 1 ? demoBySlug(missing[0]) : undefined;
  return demo ? <DemoStart slug={demo.slug} /> : <MissingPage />;
}
