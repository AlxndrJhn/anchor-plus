"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { DemoPlayer } from "@/components/demo/demo-player";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppearance } from "@/lib/appearance";
import { useThemeColor } from "@/lib/hooks/use-theme-color";
import { I18nProvider } from "@/lib/i18n/provider";
import { trackInputModality } from "@/lib/input-modality";
import { installLocalBackend } from "@/lib/local-backend/install";
import { isDemo } from "@/lib/local-backend/mode";

installLocalBackend();

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            // The API client retries failed GETs itself.
            retry: false,
          },
          // Offline, an action fails at once with its error.
          mutations: {
            networkMode: "always",
          },
        },
      }),
  );
  useEffect(trackInputModality, []);
  useAppearance();
  useThemeColor();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <I18nProvider>
          <TooltipProvider>
            {children}
            {isDemo && <DemoPlayer />}
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
