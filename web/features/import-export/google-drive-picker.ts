/**
 * Choosing a Google Takeout export in the person's Google Drive with the
 * Google Picker. Only the drive.file scope is asked for: the app sees the
 * files picked here and nothing else in the Drive.
 */

export type GoogleDriveImportConfig = {
  clientId: string;
  apiKey: string;
  appId: string;
};

export type PickedDriveFiles = {
  fileIds: string[];
  accessToken: string;
};

/** Opens Takeout with only Keep selected. */
export const KEEP_TAKEOUT_URL =
  "https://takeout.google.com/settings/takeout/custom/keep";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GSI_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";

// The few parts of the Google Identity Services and Picker globals used here.
type TokenResponse = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken: (options?: object) => void };
type PickerDoc = { id: string };
type PickerData = { action: string; docs?: PickerDoc[] };
type GoogleGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type: string }) => void;
      }) => TokenClient;
    };
  };
  picker: {
    Action: { PICKED: string; CANCEL: string };
    Feature: { MULTISELECT_ENABLED: string };
    DocsView: new () => {
      setMimeTypes: (types: string) => unknown;
      setQuery: (query: string) => unknown;
      setIncludeFolders: (include: boolean) => unknown;
      setMode: (mode: unknown) => unknown;
    };
    DocsViewMode: { LIST: unknown };
    PickerBuilder: new () => PickerBuilder;
  };
};
type PickerBuilder = {
  [method: string]: (...args: unknown[]) => PickerBuilder;
} & { build: () => { setVisible: (visible: boolean) => void } };

declare global {
  interface Window {
    google?: GoogleGlobal;
    gapi?: { load: (name: string, callback: () => void) => void };
  }
}

const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let loading = scripts.get(src);
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scripts.delete(src);
        reject(new Error("Google could not be reached"));
      };
      document.head.append(script);
    });
    scripts.set(src, loading);
  }
  return loading;
}

async function loadGoogle(): Promise<GoogleGlobal> {
  await Promise.all([loadScript(GSI_SRC), loadScript(GAPI_SRC)]);
  await new Promise<void>((resolve) => window.gapi?.load("picker", resolve));
  if (!window.google?.picker || !window.google.accounts) {
    throw new Error("Google could not be reached");
  }
  return window.google;
}

function requestToken(
  google: GoogleGlobal,
  clientId: string,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else if (response.error === "access_denied") resolve(null);
        else reject(new Error("Google sign-in failed"));
      },
      // Closing the popup is not an error worth showing.
      error_callback: (error) =>
        error.type === "popup_closed"
          ? resolve(null)
          : reject(new Error("Google sign-in failed")),
    });
    client.requestAccessToken();
  });
}

/**
 * Signs in to Google and lets the person pick the export's ZIP parts.
 * Resolves null when they close the popup or the Picker.
 */
export async function pickTakeoutFromDrive(
  config: GoogleDriveImportConfig,
): Promise<PickedDriveFiles | null> {
  const google = await loadGoogle();
  const accessToken = await requestToken(google, config.clientId);
  if (!accessToken) return null;

  const view = new google.picker.DocsView();
  view.setMimeTypes("application/zip,application/x-zip-compressed");
  view.setQuery("takeout");
  view.setIncludeFolders(true);
  view.setMode(google.picker.DocsViewMode.LIST);

  return new Promise((resolve) => {
    const picker = new google.picker.PickerBuilder()
      .setAppId(config.appId)
      .setDeveloperKey(config.apiKey)
      .setOAuthToken(accessToken)
      .addView(view)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setTitle("Choose your Google Keep export")
      .setCallback((data: unknown) => {
        const { action, docs } = data as PickerData;
        if (action === google.picker.Action.PICKED && docs?.length) {
          resolve({ fileIds: docs.map((doc) => doc.id), accessToken });
        } else if (action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
