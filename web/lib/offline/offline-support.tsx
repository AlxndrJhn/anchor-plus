"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth/store";
import {
  allSaved,
  restoreOutbox,
  retryAllSaves,
} from "@/features/notes/save-queues";
import { useSyncStatus } from "@/features/sync/status";
import { translate } from "@/lib/i18n";
import { isServerless } from "@/lib/local-backend/mode";
import { persistQueries } from "./query-cache";

// How long coming back online waits for the edits made offline to go up.
const SYNC_WAIT_MS = 30_000;

/**
 * Lets the app work offline once signed in: notes and tags kept on the
 * device, edits made offline sent later, and a service worker that serves
 * the app itself without a connection.
 */
export function OfflineSupport() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    // Without a server the notes are already on the device.
    if (!userId || isServerless) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void persistQueries(queryClient, userId).then((cleanup) => {
      if (cancelled) {
        cleanup();
        return;
      }
      stop = cleanup;
      restoreOutbox(queryClient, userId);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [queryClient, userId]);

  useEffect(() => {
    if (isServerless) return;
    let waiting: number | undefined;
    const unsubscribe = useSyncStatus.subscribe((state, before) => {
      if (state.online === before.online) return;
      window.clearTimeout(waiting);
      if (!state.online) return;
      // Back: send what waited, then say so once it is all on the server.
      retryAllSaves();
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      const since = Date.now();
      const check = async () => {
        if (!useSyncStatus.getState().online) return;
        if (await allSaved()) {
          toast.success(translate("layout.offline")("synced"), {
            id: "online",
          });
          return;
        }
        if (Date.now() - since > SYNC_WAIT_MS) {
          toast.info(translate("layout.offline")("stillWaiting"), {
            id: "online",
          });
          return;
        }
        waiting = window.setTimeout(check, 500);
      };
      waiting = window.setTimeout(check, 500);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(waiting);
    };
  }, [queryClient]);

  useEffect(() => {
    // Development serves changing files; only a build is cached.
    if (process.env.NODE_ENV !== "production" || isServerless) return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
