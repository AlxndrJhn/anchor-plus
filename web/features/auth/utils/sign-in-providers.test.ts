import { describe, expect, it } from "vitest";
import { isLinkedTo, signInProviders } from "./sign-in-providers";

const base = {
  enabled: true,
  providerName: "Pocket ID",
  issuerUrl: "https://id.example.com",
  clientId: "anchor",
  disableInternalAuth: false,
};

describe("signInProviders", () => {
  it("lists every provider the server sends", () => {
    const providers = [
      { id: "default", name: "Pocket ID" },
      { id: "work", name: "Work Keycloak" },
    ];
    expect(signInProviders({ ...base, providers })).toEqual(providers);
  });

  it("makes the one provider of an older server the first", () => {
    expect(signInProviders(base)).toEqual([
      {
        id: "default",
        name: "Pocket ID",
        issuerUrl: "https://id.example.com",
        clientId: "anchor",
      },
    ]);
  });

  it("lists none while sign-in with a provider is off", () => {
    expect(signInProviders({ ...base, enabled: false })).toEqual([]);
    expect(signInProviders(undefined)).toEqual([]);
  });
});

describe("isLinkedTo", () => {
  it("checks each provider", () => {
    const status = { providerLinked: true, linkedProviders: ["work"] };
    expect(isLinkedTo(status, "work")).toBe(true);
    expect(isLinkedTo(status, "default")).toBe(false);
  });

  it("goes by the one link an older server reports", () => {
    expect(isLinkedTo({ providerLinked: true }, "default")).toBe(true);
  });
});
