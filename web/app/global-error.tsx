"use client";

import { RotateCw } from "lucide-react";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import * as React from "react";
import { ErrorScreen } from "@/components/layout/error-screen";
import { Button } from "@/components/ui/button";
import { currentLocale, translate } from "@/lib/i18n";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  React.useEffect(() => console.error(error), [error]);
  // Outside the providers, so in the language last on screen.
  const t = translate("layout.errors");

  return (
    <html
      lang={currentLocale()}
      suppressHydrationWarning
      className={dmSans.variable}
    >
      <body>
        <title>Anchor+</title>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="grid min-h-dvh content-center bg-background px-4">
            <ErrorScreen
              illustration="broken"
              title={t("title")}
              text={t("text")}
              actions={
                <Button onClick={() => window.location.reload()}>
                  <RotateCw aria-hidden />
                  {t("reload")}
                </Button>
              }
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
