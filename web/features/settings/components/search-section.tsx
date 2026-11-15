"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  getPictureSearchStatus,
  type PictureSearchStatus,
  pictureSearchStatusKey,
  setPictureSearch,
} from "@/features/picture-search/api";
import { Row, RowText, Section } from "./settings-blocks";

/** Where indexing is, in a few words. */
function progressText(
  status: PictureSearchStatus,
  t: ReturnType<typeof useTranslations<"settings.searchSection">>,
): string | null {
  if (!status.enabled) return null;
  const { model } = status;
  if (model.state === "downloading")
    return t("downloading", { percent: Math.round(model.progress * 100) });
  if (model.state === "failed") return t("modelFailed");
  if (status.indexed < status.total)
    return t("indexing", { indexed: status.indexed, total: status.total });
  return t("ready", { count: status.total });
}

export function SearchSection() {
  const t = useTranslations("settings.searchSection");
  const queryClient = useQueryClient();
  const { data: status } = useQuery({
    queryKey: pictureSearchStatusKey,
    queryFn: getPictureSearchStatus,
    // Follows the download and the indexing while they run.
    refetchInterval: (query) => {
      const s = query.state.data;
      return s?.enabled &&
        (s.model.state === "downloading" || s.indexed < s.total)
        ? 2000
        : false;
    },
  });
  const toggle = useMutation({
    mutationFn: setPictureSearch,
    onSuccess: (next) => queryClient.setQueryData(pictureSearchStatusKey, next),
    onError: () => toast.error(t("couldNotChange")),
  });

  if (!status?.available) return null;
  const progress = progressText(status, t);
  return (
    <Section id="search" title={t("title")}>
      <Row>
        <RowText
          title={<label htmlFor="picture-search">{t("findPictures")}</label>}
          text={
            <>
              {t("findPicturesText")}
              {progress && (
                <span className="mt-1 block text-foreground" aria-live="polite">
                  {progress}
                </span>
              )}
            </>
          }
        />
        <Switch
          id="picture-search"
          checked={status.enabled}
          disabled={toggle.isPending}
          onCheckedChange={(on) => toggle.mutate(on)}
        />
      </Row>
    </Section>
  );
}
