import { api } from "@/lib/api/client";
import type {
  AdminStats,
  AdminUser,
  CreateOidcProviderDto,
  CreateUserDto,
  OidcIssuerTest,
  OidcSettings,
  RegistrationSettings,
  ResetPasswordResponse,
  SecondFactorSettings,
  UpdateOidcProviderDto,
  UpdateOidcSettingsDto,
  UpdateRegistrationModeDto,
  UpdateUserDto,
  UsersListResponse,
} from "./types";

export async function getAdminStats(): Promise<AdminStats> {
  return api.get("api/admin/stats").json<AdminStats>();
}

export async function getUsers(
  skip = 0,
  take = 50,
  filter: { q?: string; status?: "active" | "pending" } = {},
): Promise<UsersListResponse> {
  return api
    .get("api/admin/users", {
      searchParams: {
        skip: skip.toString(),
        take: take.toString(),
        ...(filter.q ? { q: filter.q } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
    })
    .json<UsersListResponse>();
}

export async function createUser(data: CreateUserDto): Promise<AdminUser> {
  return api.post("api/admin/users", { json: data }).json<AdminUser>();
}

export async function updateUser(
  id: string,
  data: UpdateUserDto,
): Promise<AdminUser> {
  return api.patch(`api/admin/users/${id}`, { json: data }).json<AdminUser>();
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  return api.delete(`api/admin/users/${id}`).json<{ message: string }>();
}

export async function resetPassword(
  id: string,
  newPassword?: string,
): Promise<ResetPasswordResponse> {
  return api
    .post(`api/admin/users/${id}/reset-password`, {
      json: { newPassword },
    })
    .json<ResetPasswordResponse>();
}

export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  return api
    .get("api/admin/settings/registration")
    .json<RegistrationSettings>();
}

export async function updateRegistrationMode(
  data: UpdateRegistrationModeDto,
): Promise<RegistrationSettings> {
  return api
    .patch("api/admin/settings/registration", { json: data })
    .json<RegistrationSettings>();
}

export async function getPendingUsers(): Promise<AdminUser[]> {
  return api.get("api/admin/users/pending").json<AdminUser[]>();
}

export async function approveUser(id: string): Promise<AdminUser> {
  return api.post(`api/admin/users/${id}/approve`).json<AdminUser>();
}

export async function rejectUser(id: string): Promise<{ message: string }> {
  return api.post(`api/admin/users/${id}/reject`).json<{ message: string }>();
}

export async function getOidcSettings(): Promise<OidcSettings> {
  return api.get("api/admin/settings/oidc").json<OidcSettings>();
}

export async function updateOidcSettings(
  data: UpdateOidcSettingsDto,
): Promise<OidcSettings> {
  return api
    .patch("api/admin/settings/oidc", { json: data })
    .json<OidcSettings>();
}

export async function createOidcProvider(
  data: CreateOidcProviderDto,
): Promise<OidcSettings> {
  return api
    .post("api/admin/settings/oidc/providers", { json: data })
    .json<OidcSettings>();
}

export async function updateOidcProvider(
  id: string,
  data: UpdateOidcProviderDto,
): Promise<OidcSettings> {
  return api
    .patch(`api/admin/settings/oidc/providers/${encodeURIComponent(id)}`, {
      json: data,
    })
    .json<OidcSettings>();
}

export async function deleteOidcProvider(id: string): Promise<OidcSettings> {
  return api
    .delete(`api/admin/settings/oidc/providers/${encodeURIComponent(id)}`)
    .json<OidcSettings>();
}

export async function getSecondFactorSettings(): Promise<SecondFactorSettings> {
  return api
    .get("api/admin/settings/second-factor")
    .json<SecondFactorSettings>();
}

export async function updateSecondFactorRequired(
  required: boolean,
): Promise<SecondFactorSettings> {
  return api
    .put("api/admin/settings/second-factor", { json: { required } })
    .json<SecondFactorSettings>();
}

export async function testOidcIssuer(
  issuerUrl: string,
): Promise<OidcIssuerTest> {
  return api
    .post("api/admin/settings/oidc/test", { json: { issuerUrl } })
    .json<OidcIssuerTest>();
}
