"use client";

import { Link as LinkIcon, Unlink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTitle,
} from "@/components/ui/popover";
import { isLikelyUrl, normalizeUrl } from "../../link-utils";

export interface LinkPopoverProps {
  open: boolean;
  anchor: DOMRect | null;
  initialText: string;
  initialUrl: string;
  isEditing: boolean;
  onSubmit: (text: string, url: string) => void;
  onRemove?: () => void;
  /** `returnFocus` is false when a click or focus outside closed it. */
  onClose: (returnFocus: boolean) => void;
}

const isLinkAddress = (value: string) =>
  isLikelyUrl(value) && !/^[a-z]+:\/*$/i.test(value.trim());

/** The parent resets it with a `key` on each open. */
export function LinkPopover({
  open,
  anchor,
  initialText,
  initialUrl,
  isEditing,
  onSubmit,
  onRemove,
  onClose,
}: LinkPopoverProps) {
  const t = useTranslations("editor.linkPopover");
  const tc = useTranslations("common");
  const [text, setText] = useState(initialText);
  const isClosedOutside = useRef(false);
  const [url, setUrl] = useState(initialUrl);
  const virtualAnchor = useMemo(
    () => ({
      current: { getBoundingClientRect: () => anchor ?? new DOMRect() },
    }),
    [anchor],
  );

  const isAddress = isLinkAddress(url);
  const isMultiLine = initialText.includes("\n");
  const submit = () => {
    const address = url.trim();
    if (!isAddress) return;
    onSubmit(text.trim() || address, normalizeUrl(address));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose(!isClosedOutside.current);
      }}
    >
      <PopoverAnchor virtualRef={virtualAnchor} />
      <PopoverContent
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => {
          isClosedOutside.current = true;
        }}
        className="w-80 p-3.5"
      >
        <PopoverTitle className="sr-only">{t("title")}</PopoverTitle>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {!isMultiLine && (
            <Field label={t("text")}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("textPlaceholder")}
                autoFocus={isEditing || !initialText}
              />
            </Field>
          )}
          <Field label={t("link")}>
            <Input
              icon={<LinkIcon aria-hidden />}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("linkPlaceholder")}
              inputMode="url"
              autoComplete="url"
              autoFocus={!isEditing && !!initialText}
            />
          </Field>
          <div className="mt-0.5 flex items-center justify-end gap-2">
            {isEditing && onRemove && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="mr-auto"
                onClick={onRemove}
              >
                <Unlink aria-hidden />
                {t("remove")}
              </Button>
            )}
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => onClose(true)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={!isAddress}>
              {isEditing ? tc("save") : t("add")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
