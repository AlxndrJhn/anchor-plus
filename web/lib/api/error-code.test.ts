import { HTTPError } from "ky";
import { afterEach, describe, expect, it } from "vitest";
import { loadMessages } from "@/lib/i18n";
import { setCurrentMessages } from "@/lib/i18n/messages";
import en from "@/messages/en";
import {
  errorCodeOf,
  errorText,
  refusedFieldsOf,
  translatedError,
} from "./error-code";

const refused = (data: unknown) =>
  Object.assign(
    new HTTPError(
      new Response(null, { status: 403 }),
      new Request("http://localhost/api/auth/login", { method: "POST" }),
      {} as never,
    ),
    { data },
  );

afterEach(() => setCurrentMessages("en", en));

describe("error codes", () => {
  it("reads the code the server sends", () => {
    expect(errorCodeOf(refused({ code: "LAST_ADMIN" }))).toBe("LAST_ADMIN");
    expect(errorCodeOf(new Error("offline"))).toBeUndefined();
  });

  it("fills in the values the message names", () => {
    expect(
      translatedError(
        refused({
          code: "PASSWORD_SIGN_IN_DISABLED",
          params: { provider: "Pocket ID" },
        }),
      ),
    ).toBe("Email and password sign-in is turned off. Sign in with Pocket ID.");
  });

  it("says it in the language on screen", async () => {
    setCurrentMessages("de", await loadMessages("de"));
    expect(translatedError(refused({ code: "TAG_NAME_EXISTS" }))).toBe(
      "Es gibt schon ein Tag mit diesem Namen.",
    );
    expect(
      translatedError(
        refused({ code: "TOO_MANY_ATTEMPTS", params: { minutes: 1 } }),
      ),
    ).toBe("Zu viele Versuche. Versuche es in 1 Minute erneut.");
  });

  it("leaves a code it doesn't know to the server's words", () => {
    expect(translatedError(refused({ code: "BRAND_NEW" }))).toBeUndefined();
    expect(translatedError(refused({ code: "toString" }))).toBeUndefined();
    expect(errorText(null)).toBeUndefined();
    expect(errorText("ACCOUNT_PENDING")).toBe(
      "Your account is waiting for an admin to approve it.",
    );
  });

  it("names the fields a validation turned down", () => {
    expect(
      refusedFieldsOf(
        refused({
          code: "VALIDATION_FAILED",
          fields: [{ field: "email", rules: ["isEmail"] }],
        }),
      ),
    ).toEqual(["email"]);
  });
});
