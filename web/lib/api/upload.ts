import { toast } from "@/components/ui/toast";
import { getAccessToken } from "@/features/auth/store";
import { isServerless } from "@/lib/local-backend/mode";
import { refreshAccessToken } from "./client";

interface UploadOptions {
  /** 0 to 1 as the file goes up. */
  onProgress?: (done: number) => void;
  signal?: AbortSignal;
}

function send(path: string, body: FormData, options: UploadOptions) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException("Upload canceled", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/${path}`);
    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error("Couldn’t reach the server"));
    xhr.onabort = () =>
      reject(new DOMException("Upload canceled", "AbortError"));
    options.signal?.addEventListener("abort", () => xhr.abort(), {
      once: true,
    });
    xhr.send(body);
  });
}

/** Without a server the app stores the file itself (see lib/local-backend). */
async function sendLocally(path: string, body: FormData) {
  const response = await fetch(`/${path}`, { method: "POST", body });
  return { status: response.status, text: await response.text() };
}

/** XMLHttpRequest: fetch has no upload progress. */
export async function uploadWithProgress<T>(
  path: string,
  body: FormData,
  options: UploadOptions = {},
): Promise<T> {
  if (isServerless) {
    const response = await sendLocally(path, body);
    options.onProgress?.(1);
    return parseUpload<T>(response);
  }
  let response = await send(path, body, options);
  if (response.status === 401 && (await refreshAccessToken()))
    response = await send(path, body, options);
  return parseUpload<T>(response);
}

/** A refused upload: the server's status, its message and code if any. */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** The account has used all the storage its plan allows. */
export const isStorageFull = (error: unknown) =>
  error instanceof UploadError && error.code === "STORAGE_QUOTA_EXCEEDED";

/** Says so once, however many uploads were refused at the same time. */
export function toastStorageFull(error: unknown) {
  toast.error((error as Error).message, { id: "storage-full" });
}

function parseUpload<T>(response: { status: number; text: string }): T {
  let data: unknown = null;
  try {
    data = JSON.parse(response.text);
  } catch {}
  if (response.status < 200 || response.status >= 300) {
    const refusal = data as {
      message?: string | string[];
      code?: string;
    } | null;
    const message = refusal?.message;
    throw new UploadError(
      Array.isArray(message)
        ? message.join(", ")
        : (message ?? `Upload failed (${response.status})`),
      response.status,
      refusal?.code,
    );
  }
  return data as T;
}
