"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useRetry } from "@/lib/hooks/use-retry";
import { cn, storageSize } from "@/lib/utils";
import { getStorageUsage, type Plan } from "../api";
import { Row, RowText, Section } from "./settings-blocks";

const PLAN_NAMES: Record<Plan, string> = { free: "Free", plus: "Plus" };

/**
 * How much the account has uploaded (pictures, recordings and files) and,
 * on a server with storage quotas, how much its plan allows.
 */
export function StorageSection() {
  const t = useTranslations("settings.storage");
  const query = useQuery({
    queryKey: ["storage-usage"],
    queryFn: getStorageUsage,
    staleTime: 60 * 1000,
  });
  const retry = useRetry(query.refetch);
  const usage = query.data;

  return (
    <Section id="storage" title={t("title")} description={t("description")}>
      {query.isError ? (
        <Row>
          <LoadFailedRow
            className="flex-1"
            message={t("loadFailed")}
            onRetry={retry.retry}
            isRetrying={retry.isRetrying}
          />
        </Row>
      ) : !usage ? (
        <Row className="grid gap-2.5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Row>
      ) : usage.limitBytes === null ? (
        <Row>
          <RowText
            title={t("used", { size: storageSize(usage.usedBytes) })}
            text={t("noLimit")}
          />
        </Row>
      ) : (
        <LimitedUsage
          plan={usage.plan}
          usedBytes={usage.usedBytes}
          limitBytes={usage.limitBytes}
        />
      )}
    </Section>
  );
}

function LimitedUsage({
  plan,
  usedBytes,
  limitBytes,
}: {
  plan: Plan;
  usedBytes: number;
  limitBytes: number;
}) {
  const t = useTranslations("settings.storage");
  const share = limitBytes > 0 ? Math.min(usedBytes / limitBytes, 1) : 1;
  const full = usedBytes >= limitBytes;
  const nearlyFull = !full && share >= 0.9;
  return (
    <Row className="grid gap-2.5">
      <RowText
        title={t("usedOf", {
          used: storageSize(usedBytes),
          limit: storageSize(limitBytes),
        })}
        text={
          full
            ? t("full")
            : nearlyFull
              ? t("almostFull", { plan: PLAN_NAMES[plan] })
              : t("plan", { plan: PLAN_NAMES[plan] })
        }
      />
      <div
        // The line above says the same in words.
        aria-hidden
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            full || nearlyFull ? "bg-destructive" : "bg-accent-strong",
          )}
          style={{ width: `${Math.max(share * 100, usedBytes > 0 ? 1 : 0)}%` }}
        />
      </div>
    </Row>
  );
}
