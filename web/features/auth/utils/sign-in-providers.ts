import type { OidcConfig, OidcProviderOption } from "../types";

/** The first provider's ID, the one older servers have alone. */
export const FIRST_PROVIDER_ID = "default";

/**
 * The providers to show a "Continue with …" button for, in order. A server
 * from before there could be several describes its one provider in the
 * top-level fields only.
 */
export function signInProviders(
  config: OidcConfig | undefined,
): OidcProviderOption[] {
  if (!config?.enabled) return [];
  if (config.providers?.length) return config.providers;
  return [
    {
      id: FIRST_PROVIDER_ID,
      name: config.providerName,
      issuerUrl: config.issuerUrl,
      clientId: config.clientId,
    },
  ];
}

/** Whether the account is connected to this provider. */
export function isLinkedTo(
  status: { providerLinked: boolean; linkedProviders?: string[] },
  providerId: string,
): boolean {
  // Older servers say only whether it's connected to their one provider.
  if (!status.linkedProviders) return status.providerLinked;
  return status.linkedProviders.includes(providerId);
}
