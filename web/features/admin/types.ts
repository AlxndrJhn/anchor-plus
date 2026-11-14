import type { RegistrationMode } from "@/features/auth/types";
import type { Plan } from "@/features/settings/api";

export interface AdminStats {
  totalUsers: number;
  totalNotes: number;
  totalTags: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  profileImage?: string | null;
  isAdmin: boolean;
  status: "active" | "pending";
  authMethod?: "oidc" | "local";
  plan?: Plan;
  /** The admin's own storage limit in MB; null follows the plan. */
  storageQuotaMb?: number | null;
  /** limitBytes null: no limit. */
  storage?: { usedBytes: number; limitBytes: number | null };
  createdAt: string;
  updatedAt: string;
  _count?: {
    notes: number;
    tags: number;
  };
}

export interface UsersListResponse {
  users: AdminUser[];
  total: number;
  skip: number;
  take: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  isAdmin?: boolean;
  plan?: Plan;
  storageQuotaMb?: number | null;
}

export interface ResetPasswordResponse {
  newPassword?: string;
  message: string;
}

export type { RegistrationMode };

export interface RegistrationSettings {
  mode: RegistrationMode;
  isLocked: boolean;
  source: "env" | "database" | "default";
}

export interface UpdateRegistrationModeDto {
  mode: RegistrationMode;
}

export interface OidcSettings {
  enabled: boolean;
  providerName: string;
  issuerUrl?: string;
  clientId?: string;
  hasClientSecret: boolean;
  mobileClientId?: string;
  callbackUrl: string;
  disableInternalAuth: boolean;
  isLocked: boolean;
  source: "env" | "database" | "default";
}

export type OidcIssuerTest =
  | { ok: true; issuer: string; supportsPkce: boolean }
  | { ok: false; message: string; issuer?: string };

export interface UpdateOidcSettingsDto {
  enabled?: boolean;
  providerName?: string;
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;
  clearClientSecret?: boolean;
  mobileClientId?: string;
  disableInternalAuth?: boolean;
}

export interface SecondFactorSettings {
  required: boolean;
  since: string | null;
  /** From when a password alone only lets people set one up. */
  deadline: string | null;
  graceDays: number;
  /** Active people who still sign in with a password alone. */
  passwordOnly: { id: string; name: string; email: string }[];
}
