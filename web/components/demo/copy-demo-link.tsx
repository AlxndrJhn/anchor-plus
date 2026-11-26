"use client";

import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import { publicPath } from "@/lib/local-backend/mode";

/** The address a feature demo plays at, to send to someone. */
export function demoUrl(slug: string) {
  return new URL(publicPath(`/${slug}`), window.location.origin).href;
}

/** The address of a feature without a demo: its entry in the demo list. */
export function featureUrl(slug: string) {
  return new URL(publicPath(`/demos#feature-${slug}`), window.location.origin)
    .href;
}

/** Copies the address of a feature demo, or of a feature's entry. */
export function CopyDemoLink({
  slug,
  feature = false,
  className,
}: {
  slug: string;
  /** A feature without a demo: links to its entry in the list. */
  feature?: boolean;
  className?: string;
}) {
  const t = useTranslations("demos.copyLink");
  const label = feature ? t("feature") : t("demo");
  return (
    <IconButton
      size="sm"
      label={label}
      title={label}
      className={className}
      onClick={() =>
        copyText(feature ? featureUrl(slug) : demoUrl(slug)).then(
          () => toast.success(t("copied")),
          () => toast.error(t("failed")),
        )
      }
    >
      <Link2 />
    </IconButton>
  );
}
