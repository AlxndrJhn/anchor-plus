"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, KeyRound, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import {
  getApiToken,
  regenerateApiToken,
  revokeApiToken,
} from "@/features/auth/api";
import { copyText } from "@/lib/clipboard";
import { useRetry } from "@/lib/hooks/use-retry";
import { popIconIn, revealText } from "@/lib/motion";
import { Row, RowText, Section } from "./settings-blocks";

const maskToken = (token: string) =>
  token.length <= 12
    ? "•".repeat(token.length)
    : `${token.slice(0, 8)}${"•".repeat(16)}${token.slice(-4)}`;

export function ApiTokenSection() {
  const t = useTranslations("settings.apiToken");
  const queryClient = useQueryClient();
  const generateButtonId = React.useId();
  const [shown, setShown] = React.useState(false);
  const [confirming, setConfirming] = React.useState<
    "regenerate" | "revoke" | null
  >(null);
  const tokenQuery = useQuery({
    queryKey: ["api-token"],
    queryFn: getApiToken,
    staleTime: 5 * 60 * 1000,
  });
  const tokenRetry = useRetry(tokenQuery.refetch);
  const token = tokenQuery.data?.apiToken ?? null;
  const value = token && (shown ? token : maskToken(token));
  const tokenField = React.useRef<HTMLInputElement>(null);
  const eyeButton = React.useRef<HTMLButtonElement>(null);
  const lastValue = React.useRef(value);
  const lastShown = React.useRef(shown);

  React.useLayoutEffect(() => {
    const was = lastValue.current;
    lastValue.current = value;
    const from = was ?? (value && maskToken(value));
    if (tokenField.current && value && from && from !== value)
      revealText(tokenField.current, from);
  }, [value]);
  React.useLayoutEffect(() => {
    if (lastShown.current === shown) return;
    lastShown.current = shown;
    popIconIn(eyeButton.current?.querySelector("svg"));
  }, [shown]);

  const generate = useMutation({
    mutationFn: regenerateApiToken,
    onSuccess: (res) => {
      queryClient.setQueryData(["api-token"], res);
      setShown(true);
      setConfirming(null);
      toast.success(token ? t("regenerated") : t("generated"));
    },
    onError: () =>
      toast.error(token ? t("regenerateFailed") : t("generateFailed"), {
        retry: () => generate.mutate(),
      }),
  });
  const revoke = useMutation({
    mutationFn: revokeApiToken,
    onSuccess: (res) => {
      queryClient.setQueryData(["api-token"], res);
      setShown(false);
      setConfirming(null);
      toast.success(t("revoked"));
    },
    onError: () =>
      toast.error(t("revokeFailed"), {
        retry: () => revoke.mutate(),
      }),
  });

  const copy = () => {
    if (!token) return;
    copyText(token).then(
      () => toast.success(t("copied")),
      () => toast.error(t("copyFailed")),
    );
  };

  return (
    <Section id="token" title={t("title")} description={t("description")}>
      {tokenQuery.isError || tokenRetry.isRetrying ? (
        <Row>
          <LoadFailedRow
            className="flex-1"
            message={t("loadFailed")}
            onRetry={tokenRetry.retry}
            isRetrying={tokenRetry.isRetrying}
          />
        </Row>
      ) : tokenQuery.isLoading ? (
        <Row className="grid gap-3" aria-busy="true">
          <Skeleton className="h-field w-full rounded-field" />
          <Skeleton className="h-3 w-2/3" />
        </Row>
      ) : token ? (
        <Row className="grid gap-3.5">
          <Input
            ref={tokenField}
            readOnly
            mono
            aria-label={t("title")}
            value={value ?? ""}
            icon={<KeyRound aria-hidden />}
            end={
              <span className="-mr-1.5 flex gap-0.5">
                <Tip label={shown ? t("hide") : t("show")}>
                  <button
                    ref={eyeButton}
                    type="button"
                    aria-label={shown ? t("hide") : t("show")}
                    onClick={() => setShown((s) => !s)}
                    className="grid size-7 cursor-pointer place-items-center rounded-sm border-0 bg-transparent text-muted-foreground hover:bg-foreground/6 hover:text-foreground [&_svg]:size-4"
                  >
                    {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </button>
                </Tip>
                <Tip label={t("copy")}>
                  <button
                    type="button"
                    aria-label={t("copy")}
                    onClick={copy}
                    className="grid size-7 cursor-pointer place-items-center rounded-sm border-0 bg-transparent text-muted-foreground hover:bg-foreground/6 hover:text-foreground [&_svg]:size-4"
                  >
                    <Copy aria-hidden />
                  </button>
                </Tip>
              </span>
            }
          />
          <FieldDescription>{t("warning")}</FieldDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirming("regenerate")}
            >
              <RotateCw aria-hidden />
              {t("regenerate")}
            </Button>
            <Button variant="danger" onClick={() => setConfirming("revoke")}>
              {t("revoke")}
            </Button>
          </div>
        </Row>
      ) : (
        <Row>
          <RowText title={t("none")} text={t("noneText")} />
          <Button
            id={generateButtonId}
            variant="secondary"
            onClick={() => generate.mutate()}
            busy={generate.isPending && t("generating")}
          >
            <KeyRound aria-hidden />
            {t("generate")}
          </Button>
        </Row>
      )}
      <ConfirmationDialog
        open={confirming === "regenerate"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={t("regenerateTitle")}
        description={t("regenerateText")}
        confirmLabel={t("regenerate")}
        busyLabel={t("regenerating")}
        variant="primary"
        isPending={generate.isPending}
        onConfirm={() => generate.mutate()}
      />
      <ConfirmationDialog
        open={confirming === "revoke"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={t("revokeTitle")}
        description={t("revokeText")}
        confirmLabel={t("revoke")}
        busyLabel={t("revoking")}
        variant="destructive"
        isPending={revoke.isPending}
        onConfirm={() => revoke.mutate()}
        fallbackFocus={() => document.getElementById(generateButtonId)}
      />
    </Section>
  );
}
