import { HTTPError } from "ky";
import { describe, expect, it } from "vitest";
import {
  isPasskeyCancelled,
  isTwoStepRequired,
  serverSignInError,
  signInError,
} from "./sign-in-error";

/** A refusal as the server sends it: an English message and a stable code. */
const failed = (
  status: number,
  message = "",
  code?: string,
  params?: Record<string, string>,
) => {
  const error = new HTTPError(
    new Response(null, { status }),
    new Request("http://localhost/api/auth/login", { method: "POST" }),
    {} as never,
  );
  if (message) error.message = message;
  return Object.assign(error, { data: { message, code, params } });
};

const needsCode = (message: string, code: string) =>
  Object.assign(failed(401, message, code), {
    data: { error: "two_step_required", code, message },
  });

describe("two-step and passkeys", () => {
  it("knows the password was right but a code is missing", () => {
    const error = needsCode(
      "Enter the code from your authenticator app",
      "TWO_STEP_REQUIRED",
    );
    expect(isTwoStepRequired(error)).toBe(true);
    expect(
      isTwoStepRequired(
        failed(401, "Invalid credentials", "INVALID_CREDENTIALS"),
      ),
    ).toBe(false);
    expect(signInError(error, "Pocket ID")).toBeNull();
  });

  it("says when the code was wrong", () => {
    expect(
      signInError(
        needsCode("That code isn’t right", "TWO_STEP_CODE_WRONG"),
        "Pocket ID",
      ),
    ).toBe(
      "That code isn’t right. Check your authenticator app and try again.",
    );
  });

  it("points to the passkey when password sign-in is off", () => {
    expect(
      signInError(
        failed(
          403,
          "Password sign-in is turned off for this account. Sign in with a passkey.",
          "PASSKEY_ONLY",
        ),
        "Pocket ID",
      ),
    ).toBe(
      "This account signs in with a passkey. Use “Sign in with a passkey” above.",
    );
  });

  it("says nothing when the passkey prompt is closed", () => {
    const closed = new DOMException("closed", "NotAllowedError");
    expect(isPasskeyCancelled(closed)).toBe(true);
    expect(signInError(closed, "Pocket ID")).toBeNull();
  });
});

describe("signInError", () => {
  it("says nothing before a sign-in fails", () => {
    expect(signInError(null, "Pocket ID")).toBeNull();
  });

  it("names the provider for an account that has no password", () => {
    expect(
      signInError(
        failed(401, "This account uses OIDC authentication.", "OIDC_ACCOUNT"),
        "Pocket ID",
      ),
    ).toBe("This account signs in with Pocket ID. Use the button above.");
  });

  it("points to the provider when email sign-in is turned off", () => {
    expect(
      signInError(
        failed(
          403,
          "Email and password sign-in is turned off. Sign in with Pocket ID.",
          "PASSWORD_SIGN_IN_DISABLED",
          { provider: "Pocket ID" },
        ),
        "Pocket ID",
      ),
    ).toBe("Sign in with Pocket ID instead.");
  });

  it("keeps a wrong password apart from other refusals", () => {
    expect(
      signInError(
        failed(401, "Invalid credentials", "INVALID_CREDENTIALS"),
        "X",
      ),
    ).toBe("Incorrect email or password.");
    expect(
      signInError(
        failed(403, "Account pending approval", "ACCOUNT_PENDING"),
        "X",
      ),
    ).toBe("pending");
    expect(signInError(failed(429), "X")).toMatch(/^Too many tries/);
  });

  it("blames the server, not the connection, when the server fails", () => {
    expect(signInError(failed(500), "X")).toMatch(/^Something went wrong/);
    expect(signInError(failed(400, "email must be an email"), "X")).toBe(
      "Couldn’t sign in. Try again.",
    );
  });

  it("blames the connection when nothing answers", () => {
    expect(signInError(new TypeError("Failed to fetch"), "X")).toMatch(
      /^Couldn’t reach the server/,
    );
  });
});

describe("codes the app knows", () => {
  it("words a passkey refusal from its code, not the server's English", () => {
    expect(
      signInError(
        failed(
          401,
          "Couldn’t sign in with that passkey",
          "PASSKEY_SIGN_IN_FAILED",
        ),
        "X",
      ),
    ).toBe("Couldn’t sign in with that passkey.");
  });

  it("keeps its own wording for a code it doesn't know", () => {
    expect(signInError(failed(401, "Something new", "BRAND_NEW"), "X")).toBe(
      "Incorrect email or password.",
    );
  });
});

describe("serverSignInError", () => {
  it("says a refused sign-in has expired, without naming the provider", () => {
    expect(serverSignInError(400)).toBe(
      "That sign-in has expired. Try again, or sign in with your email.",
    );
  });

  it("doesn't offer email when only the provider signs in", () => {
    expect(serverSignInError(400, true)).toBe(
      "That sign-in has expired. Try again.",
    );
  });

  it("tells a server failure and a lost connection apart", () => {
    expect(serverSignInError(502)).toMatch(/^Something went wrong/);
    expect(serverSignInError(0)).toMatch(/^Couldn’t reach the server/);
  });
});
