"use client";

import { Copy, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { AppPage } from "@/components/layout/app-page";
import { ErrorScreen } from "@/components/layout/error-screen";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";

/** Like “7f3a-21c9”. */
function shortId(seed?: string) {
  const hex =
    seed?.replace(/[^0-9a-f]/gi, "") ||
    crypto
      .getRandomValues(new Uint32Array(2))
      .reduce((text, part) => text + part.toString(16), "");
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`.toLowerCase();
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("layout.errors");
  const locale = useLocale();
  const id = React.useMemo(() => shortId(error.digest), [error.digest]);
  React.useEffect(() => console.error(error), [error]);

  const details = () =>
    [
      `Anchor+ ${process.env.NEXT_PUBLIC_APP_VERSION}`,
      t("code", { id }),
      window.location.pathname,
      new Date().toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      error.message,
    ].join(" · ");

  return (
    <AppPage title={null}>
      <ErrorScreen
        illustration="broken"
        code={t("code", { id })}
        title={t("title")}
        text={t("text")}
        actions={
          <>
            <Button
              onClick={() => {
                reset();
                window.location.reload();
              }}
            >
              <RotateCw aria-hidden />
              {t("reload")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                copyText(details()).then(
                  () => toast.success(t("detailsCopied")),
                  () => toast.error(t("detailsCopyFailed")),
                )
              }
            >
              <Copy aria-hidden />
              {t("copyDetails")}
            </Button>
          </>
        }
      />
    </AppPage>
  );
}
