"use client";

import { useQuery } from "@tanstack/react-query";
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
  const query = useQuery({
    queryKey: ["storage-usage"],
    queryFn: getStorageUsage,
    staleTime: 60 * 1000,
  });
  const retry = useRetry(query.refetch);
  const usage = query.data;

  return (
    <Section
      id="storage"
      title="Storage"
      description="Pictures, recordings and files you’ve added to notes."
    >
      {query.isError ? (
        <Row>
          <LoadFailedRow
            className="flex-1"
            message="Couldn’t load your storage."
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
            title={`${storageSize(usage.usedBytes)} used`}
            text="This server sets no limit."
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
  const share = limitBytes > 0 ? Math.min(usedBytes / limitBytes, 1) : 1;
  const full = usedBytes >= limitBytes;
  const nearlyFull = !full && share >= 0.9;
  return (
    <Row className="grid gap-2.5">
      <RowText
        title={`${storageSize(usedBytes)} of ${storageSize(limitBytes)} used`}
        text={
          full
            ? `Your storage is full. Delete pictures or files to add more.`
            : nearlyFull
              ? `Your storage is almost full. ${PLAN_NAMES[plan]} plan.`
              : `${PLAN_NAMES[plan]} plan.`
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
