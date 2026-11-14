"use client";

import { useMutation } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, InputButton } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  type AccountField,
  accountFieldHelp,
  NAME_MAX_LENGTH,
  refusedField,
} from "@/features/auth/account-fields";
import { useAuthStore } from "@/features/auth/store";
import type { Plan } from "@/features/settings/api";
import { copyText } from "@/lib/clipboard";
import { useLastShown } from "@/lib/hooks/use-last-shown";
import { createUser, updateUser } from "../api";
import type { AdminUser } from "../types";

const isEmailTaken = (error: Error) =>
  error instanceof HTTPError && error.response.status === 409;

const couldWorkLater = (error: Error) =>
  !(error instanceof HTTPError) || error.response.status >= 500;

type PersonErrors = Partial<Record<AccountField, string>>;

function makePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export function AddPersonDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("admin.personDialogs");
  const tc = useTranslations("common");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<PersonErrors>({});
  const refs = {
    name: React.useRef<HTMLInputElement>(null),
    email: React.useRef<HTMLInputElement>(null),
    password: React.useRef<HTMLInputElement>(null),
  };
  const showError = (field: AccountField, message: string) => {
    setErrors({ [field]: message });
    refs[field].current?.focus();
  };
  const create = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      onDone();
      onOpenChange(false);
      toast.success(t("added", { name: user.name }));
    },
    onError: (e: Error, dto) => {
      const field = refusedField(e);
      if (isEmailTaken(e)) showError("email", t("emailTaken"));
      else if (field) showError(field, accountFieldHelp(field));
      else
        toast.error(
          t("addFailed", { name: dto.name }),
          couldWorkLater(e) ? { retry: () => create.mutate(dto) } : undefined,
        );
    },
  });
  React.useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setPassword("");
    setErrors({});
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return showError("name", t("nameRequired"));
            create.mutate({ name: name.trim(), email: email.trim(), password });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addDescription")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("name")} error={errors.name}>
              <Input
                ref={refs.name}
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder={t("namePlaceholder")}
                autoFocus
              />
            </Field>
            <Field label={t("email")} error={errors.email}>
              <Input
                ref={refs.email}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="name@example.com"
                required
              />
            </Field>
            <Field label={t("password")} error={errors.password}>
              <Input
                ref={refs.password}
                mono
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder={t("passwordPlaceholder")}
                minLength={8}
                required
                end={
                  <InputButton onClick={() => setPassword(makePassword())}>
                    {t("generate")}
                  </InputButton>
                }
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="quiet"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!email.trim() || password.length < 8}
              busy={create.isPending && t("adding")}
            >
              {t("addPerson")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPersonDialog({
  user,
  isSelf,
  onClose,
  onDone,
}: {
  user: AdminUser | null;
  isSelf: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("admin.personDialogs");
  const tc = useTranslations("common");
  const planOptions = [
    { value: "free", label: t("planFree") },
    { value: "plus", label: t("planPlus") },
  ] as const;
  const shownUser = useLastShown(user, !!user);
  const isShownSelf = useLastShown(isSelf, !!user);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [plan, setPlan] = React.useState<Plan>("free");
  const [quotaMb, setQuotaMb] = React.useState("");
  const [errors, setErrors] = React.useState<PersonErrors>({});
  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const showError = (field: "name" | "email", message: string) => {
    setErrors({ [field]: message });
    (field === "name" ? nameRef : emailRef).current?.focus();
  };
  React.useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setIsAdmin(user.isAdmin);
    setPlan(user.plan ?? "free");
    setQuotaMb(user.storageQuotaMb == null ? "" : String(user.storageQuotaMb));
    setErrors({});
  }, [user]);
  const save = useMutation({
    mutationFn: () =>
      updateUser(user?.id as string, {
        name: name.trim(),
        email: email.trim(),
        ...(isSelf ? {} : { isAdmin }),
        plan,
        storageQuotaMb: quotaMb.trim() === "" ? null : Number(quotaMb),
      }),
    onSuccess: (updated) => {
      const { user: signedIn, mergeUser } = useAuthStore.getState();
      if (signedIn?.id === updated.id)
        mergeUser({ name: updated.name, email: updated.email });
      onDone();
      onClose();
      toast.success(t("saved"));
    },
    onError: (e: Error) => {
      const field = refusedField(e);
      if (isEmailTaken(e)) showError("email", t("emailTaken"));
      else if (field === "name" || field === "email")
        showError(field, accountFieldHelp(field));
      else
        toast.error(
          t("saveFailed"),
          couldWorkLater(e) ? { retry: () => save.mutate() } : undefined,
        );
    },
  });
  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return showError("name", t("nameRequired"));
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {t("editTitle", { name: shownUser?.name ?? "" })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label={t("name")} error={errors.name}>
              <Input
                ref={nameRef}
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
            </Field>
            <Field label={t("email")} error={errors.email}>
              <Input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
              />
            </Field>
            <div className="flex items-center gap-4 pt-1">
              <div className="grid flex-1 gap-0.5">
                <label htmlFor="edit-admin" className="font-semibold text-ui">
                  {t("admin")}
                </label>
                <span className="text-meta text-muted-foreground">
                  {isShownSelf ? t("adminSelf") : t("adminHelp")}
                </span>
              </div>
              <Switch
                id="edit-admin"
                checked={isAdmin}
                disabled={isShownSelf}
                onCheckedChange={setIsAdmin}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="grid flex-1 gap-0.5">
                <span className="font-semibold text-ui">{t("plan")}</span>
                <span className="text-meta text-muted-foreground">
                  {t("planHelp")}
                </span>
              </div>
              <SegmentedControl
                aria-label={t("plan")}
                size="sm"
                value={plan}
                onValueChange={setPlan}
                options={planOptions}
              />
            </div>
            <Field label={t("storageLimit")} help={t("storageLimitHelp")}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={quotaMb}
                onChange={(e) => setQuotaMb(e.target.value)}
                placeholder={
                  shownUser?.storage?.limitBytes == null ||
                  shownUser.storageQuotaMb != null
                    ? t("planLimit")
                    : t("planLimitMb", {
                        mb: Math.round(
                          shownUser.storage.limitBytes / 1024 / 1024,
                        ),
                      })
                }
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="quiet" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" busy={save.isPending && tc("saving")}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewPasswordDialog({
  value,
  onClose,
}: {
  value: { user: AdminUser; password: string } | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.personDialogs");
  const tc = useTranslations("common");
  const shown = useLastShown(value, !!value);
  const [copied, setCopied] = React.useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each new password starts with Copy
  React.useEffect(() => setCopied(false), [shown]);
  const name = shown?.user.name ?? "";
  return (
    <Dialog open={!!value} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newPasswordTitle", { name })}</DialogTitle>
          <DialogDescription>
            {t("newPasswordDescription", { name })}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Input
            readOnly
            mono
            aria-label={t("newPasswordTitle", { name })}
            value={shown?.password ?? ""}
            icon={<KeyRound aria-hidden />}
            end={
              <InputButton
                onClick={() =>
                  copyText(shown?.password ?? "").then(
                    () => setCopied(true),
                    () => toast.error(t("copyFailed")),
                  )
                }
              >
                {copied ? tc("copied") : tc("copy")}
              </InputButton>
            }
          />
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>{tc("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
