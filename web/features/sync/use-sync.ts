"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getAccessToken, useAuthStore } from "@/features/auth";
import { receiveLiveSignal } from "@/features/notes/live-hub";
import { ORDER_SAVE_KEY } from "@/features/notes/order-saves";
import { refreshAccessToken } from "@/lib/api/client";
import { connectSyncEvents } from "./events";

const syncedQueryKeys = [
  ["notes"],
  ["tags"],
  ["attachments"],
  ["note-shares"],
  ["note-revisions"],
];

const pushDebounceMs = 300;

// For servers and proxies that never deliver the push channel.
const pollIntervalMs = 5 * 60 * 1000;

export function useSync(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const pull = () => {
      // While a new order is on its way, notes and tags wait: pulled now,
      // they'd snap back to the old order. The last save pulls them.
      const isSavingOrder =
        queryClient.isMutating({ mutationKey: ORDER_SAVE_KEY }) > 0;
      for (const queryKey of syncedQueryKeys) {
        if (
          isSavingOrder &&
          (queryKey[0] === "notes" || queryKey[0] === "tags")
        )
          continue;
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    let debounce: ReturnType<typeof setTimeout> | undefined;
    const stream = connectSyncEvents({
      onSync: () => {
        clearTimeout(debounce);
        debounce = setTimeout(pull, pushDebounceMs);
      },
      // Messages sent while we were disconnected are lost.
      onReconnect: pull,
      onLive: receiveLiveSignal,
      getToken: getAccessToken,
      refreshToken: refreshAccessToken,
    });

    const poll = setInterval(pull, pollIntervalMs);
    const pullWhenVisible = () => {
      if (document.visibilityState === "visible") pull();
    };

    document.addEventListener("visibilitychange", pullWhenVisible);
    window.addEventListener("online", pull);

    return () => {
      stream.close();
      clearTimeout(debounce);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", pullWhenVisible);
      window.removeEventListener("online", pull);
    };
  }, [isAuthenticated, queryClient]);
}
