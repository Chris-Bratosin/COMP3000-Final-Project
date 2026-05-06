import type { ScanSettingsState } from "@/lib/types";

const STORAGE_KEY = "scanSettings";

// AWS credentials must never be written to localStorage. The four fields below
// are explicitly zeroed on every save and forced empty on load so a stale
// credential cannot survive a page reload.
const CREDENTIAL_FIELDS = [
  "accessKeyId",
  "secretAccessKey",
  "sessionToken",
  "assumeRoleArn",
] as const;

export function stripCredentials(
  settings: ScanSettingsState,
): ScanSettingsState {
  const stripped = { ...settings };
  for (const field of CREDENTIAL_FIELDS) {
    stripped[field] = "";
  }
  return stripped;
}

export function saveSettings(settings: ScanSettingsState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripCredentials(settings)));
}

export function loadSettings(
  fallback: ScanSettingsState,
): ScanSettingsState {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ScanSettingsState>;
    return {
      ...fallback,
      ...parsed,
      // Defence-in-depth: re-strip on load even though saveSettings should
      // already have stripped these. A pre-existing localStorage entry from an
      // older version of the app, or one tampered with via devtools, would
      // otherwise be trusted.
      ...Object.fromEntries(CREDENTIAL_FIELDS.map((f) => [f, ""])),
      connectionStatus: "Pending",
      connectedAccount: "",
      connectionMessage: fallback.connectionMessage,
    };
  } catch {
    return fallback;
  }
}
