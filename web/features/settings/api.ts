import { api } from "@/lib/api/client";

export type Plan = "free" | "plus";

export interface StorageUsage {
  plan: Plan;
  usedBytes: number;
  /** null: no limit, as on a self-hosted server. */
  limitBytes: number | null;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  return api.get("api/users/me/storage").json<StorageUsage>();
}
