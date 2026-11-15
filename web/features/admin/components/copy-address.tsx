"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { Input, InputButton } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";

export function CopyAddress({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const t = useTranslations("admin.singleSignOn");
  const tc = useTranslations("common");
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <Input
      readOnly
      mono
      aria-label={label}
      value={value}
      boxClassName="bg-card"
      end={
        <InputButton
          aria-label={t("copyLabel", { label })}
          onClick={() =>
            copyText(value).then(
              () => setCopied(true),
              () => toast.error(t("copyAddressFailed")),
            )
          }
        >
          {copied ? tc("copied") : tc("copy")}
        </InputButton>
      }
    />
  );
}
