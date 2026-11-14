"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, Lock, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { RadioCards } from "@/components/ui/radio-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  SaveStatus,
  SectionHeader,
  useSaveStatus,
} from "@/features/settings/components/settings-blocks";
import { useRetry } from "@/lib/hooks/use-retry";
import { getRegistrationSettings, updateRegistrationMode } from "../api";
import { adminKeys } from "../queries";
import type { RegistrationMode } from "../types";
import { LockNote } from "./admin-parts";
import { SecondFactorPolicy } from "./second-factor-policy";
import { SingleSignOn } from "./single-sign-on";

export function SignInTab({ hidden }: { hidden?: boolean }) {
  const t = useTranslations("admin.signInTab");
  const queryClient = useQueryClient();
  const registration = useQuery({
    queryKey: adminKeys.registration,
    queryFn: getRegistrationSettings,
  });
  const registrationRetry = useRetry(registration.refetch);
  const [registrationSaveState, setRegistrationSaveState] = useSaveStatus();

  const saveMode = useMutation({
    mutationFn: (mode: RegistrationMode) => updateRegistrationMode({ mode }),
    onMutate: (mode) => {
      const before = queryClient.getQueryData(adminKeys.registration);
      queryClient.setQueryData(
        adminKeys.registration,
        (prev: object | undefined) => (prev ? { ...prev, mode } : prev),
      );
      return { before };
    },
    onSuccess: () => {
      setRegistrationSaveState("saved");
      queryClient.invalidateQueries({
        queryKey: adminKeys.pendingUsers,
      });
    },
    onError: (_, mode, context) => {
      queryClient.setQueryData(adminKeys.registration, context?.before);
      toast.error(t("saveFailed"), {
        retry: () => saveMode.mutate(mode),
      });
    },
  });
  const locked = !!registration.data?.isLocked;

  return (
    <div hidden={hidden} className="grid max-w-180 gap-6.5">
      <section className="grid gap-2.5">
        <SectionHeader
          title={t("title")}
          description={t("description")}
          saved={<SaveStatus state={registrationSaveState} />}
        />
        {locked && (
          <LockNote>
            {t.rich("locked", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </LockNote>
        )}
        {(registration.isError && !registration.data) ||
        registrationRetry.isRetrying ? (
          <LoadFailedRow
            message={t("loadFailed")}
            onRetry={registrationRetry.retry}
            isRetrying={registrationRetry.isRetrying}
          />
        ) : registration.isLoading ? (
          <Skeleton className="h-22 w-full rounded-xl" />
        ) : (
          <RadioCards
            aria-label={t("title")}
            value={registration.data?.mode ?? "review"}
            onValueChange={(mode) => saveMode.mutate(mode)}
            className="grid-cols-3 max-md:grid-cols-1"
            options={[
              {
                value: "enabled",
                label: t("open"),
                icon: <DoorOpen />,
                description: t("openDescription"),
                disabled: locked,
              },
              {
                value: "review",
                label: t("review"),
                icon: <UserCheck />,
                description: t("reviewDescription"),
                disabled: locked,
              },
              {
                value: "disabled",
                label: t("closed"),
                icon: <Lock />,
                description: t("closedDescription"),
                disabled: locked,
              },
            ]}
          />
        )}
      </section>
      <SecondFactorPolicy />
      <SingleSignOn isHidden={hidden} />
    </div>
  );
}
