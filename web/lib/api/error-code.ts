import { HTTPError } from "ky";
import { translate } from "@/lib/i18n";
import en from "@/messages/en";

/** What the server adds to an error: see server/src/common/errors/coded.ts. */
type ErrorBody = {
  code?: string;
  params?: Record<string, string | number>;
};

export type ErrorCode = keyof typeof en.errors & string;

/** Plain over the errors namespace: its keys come from the server at run time. */
const errorsT = () =>
  translate("errors") as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;

const bodyOf = (error: unknown): ErrorBody =>
  error instanceof HTTPError &&
  typeof error.data === "object" &&
  error.data !== null
    ? (error.data as ErrorBody)
    : {};

/** The server's stable name for the error, like "INVALID_CREDENTIALS". */
export const errorCodeOf = (error: unknown): string | undefined =>
  bodyOf(error).code;

/** The values the server's message names, like a provider's name. */
export const errorParamsOf = (
  error: unknown,
): Record<string, string | number> => bodyOf(error).params ?? {};

const isKnown = (code: string | undefined): code is ErrorCode =>
  !!code && Object.hasOwn(en.errors, code);

/**
 * The error in the language on screen, or undefined for a code this app
 * doesn't know (an older or newer server), which keeps the server's words.
 */
export function translatedError(error: unknown): string | undefined {
  const code = errorCodeOf(error);
  if (!isKnown(code)) return undefined;
  return errorsT()(code, errorParamsOf(error));
}

/** The fields a VALIDATION_FAILED turned down, like "email". */
export const refusedFieldsOf = (error: unknown): string[] =>
  (bodyOf(error) as { fields?: { field: string }[] }).fields?.map(
    (entry) => entry.field,
  ) ?? [];

/** A code from a redirect's address, in the language on screen. */
export function errorText(code: string | null | undefined): string | undefined {
  if (!isKnown(code ?? undefined)) return undefined;
  return errorsT()(code as ErrorCode);
}
