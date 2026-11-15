"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { formatLongDate } from "@/features/preferences";
import {
  Row,
  RowText,
  SectionHeader,
} from "@/features/settings/components/settings-blocks";
import { useRetry } from "@/lib/hooks/use-retry";
import { cn } from "@/lib/utils";
import { getSecondFactorSettings, updateSecondFactorRequired } from "../api";
import { adminKeys } from "../queries";
import { cardClass } from "./admin-parts";

const SHOWN_PEOPLE = 8;

const day = (iso: string) => formatLongDate(new Date(iso));

/** The rule that everyone signs in with more than a password. */
export function SecondFactorPolicy() {
  const t = useTranslations("admin.secondFactorPolicy");
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: adminKeys.secondFactor,
    queryFn: getSecondFactorSettings,
  });
  const retry = useRetry(settings.refetch);
  const save = useMutation({
    mutationFn: updateSecondFactorRequired,
    onSuccess: (updated) => {
      queryClient.setQueryData(adminKeys.secondFactor, updated);
      toast.success(
        updated.required && updated.deadline
          ? t("deadlineSet", { date: day(updated.deadline) })
          : t("turnedOff"),
      );
    },
    onError: (_, required) =>
      toast.error(t("saveFailed"), {
        retry: () => save.mutate(required),
      }),
  });
  const data = settings.data;
  const passed =
    !!data?.deadline && new Date(data.deadline).getTime() <= Date.now();

  return (
    <section className="grid gap-2.5">
      <SectionHeader title={t("title")} description={t("description")} />
      {(settings.isError && !data) || retry.isRetrying ? (
        <LoadFailedRow
          message={t("loadFailed")}
          onRetry={retry.retry}
          isRetrying={retry.isRetrying}
        />
      ) : !data ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : (
        <div
          data-slot="card"
          className={cn(cardClass, "[&>*+*]:border-border/55 [&>*+*]:border-t")}
        >
          <Row>
            <RowText
              title={
                <label htmlFor="require-second-factor">{t("require")}</label>
              }
              text={
                !data.required || !data.deadline
                  ? t("graceText", { days: data.graceDays })
                  : passed
                    ? t("sinceText", { date: day(data.deadline) })
                    : t("untilText", { date: day(data.deadline) })
              }
            />
            <Switch
              id="require-second-factor"
              checked={data.required}
              disabled={save.isPending}
              onCheckedChange={(required) => save.mutate(required)}
            />
          </Row>
          {data.required && (
            <Row className="block">
              {data.passwordOnly.length === 0 ? (
                <RowText title={t("allSetTitle")} text={t("allSetText")} />
              ) : (
                <div className="grid gap-2">
                  <RowText
                    title={t("stillPasswordOnly", {
                      count: data.passwordOnly.length,
                    })}
                    text={passed ? t("askedNextSignIn") : t("seeReminder")}
                  />
                  <ul className="m-0 grid list-none gap-1 p-0 text-meta">
                    {data.passwordOnly.slice(0, SHOWN_PEOPLE).map((person) => (
                      <li key={person.id} className="flex flex-wrap gap-x-2">
                        <span className="font-semibold">{person.name}</span>
                        <span className="text-muted-foreground">
                          {person.email}
                        </span>
                      </li>
                    ))}
                    {data.passwordOnly.length > SHOWN_PEOPLE && (
                      <li className="text-muted-foreground">
                        {t("andMore", {
                          count: data.passwordOnly.length - SHOWN_PEOPLE,
                        })}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </Row>
          )}
        </div>
      )}
    </section>
  );
}
