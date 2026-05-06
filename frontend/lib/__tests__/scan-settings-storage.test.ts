import {
  loadSettings,
  saveSettings,
  stripCredentials,
} from "@/lib/scan-settings-storage";
import { initialScanSettings } from "@/lib/mock-data";
import type { ScanSettingsState } from "@/lib/types";

const liveCreds = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  sessionToken: "FwoGZXIvYXdzEJr...example",
  assumeRoleArn: "arn:aws:iam::123456789012:role/ExampleRole",
};

beforeEach(() => {
  localStorage.clear();
});

describe("stripCredentials", () => {
  it("zeroes all four credential fields", () => {
    const settings: ScanSettingsState = {
      ...initialScanSettings,
      ...liveCreds,
    };
    const stripped = stripCredentials(settings);
    expect(stripped.accessKeyId).toBe("");
    expect(stripped.secretAccessKey).toBe("");
    expect(stripped.sessionToken).toBe("");
    expect(stripped.assumeRoleArn).toBe("");
  });

  it("preserves non-credential settings", () => {
    const settings: ScanSettingsState = {
      ...initialScanSettings,
      ...liveCreds,
      primaryRegion: "ap-southeast-2",
      bucketNames: "demo-bucket-1,demo-bucket-2",
      scanLevel: "deep",
    };
    const stripped = stripCredentials(settings);
    expect(stripped.primaryRegion).toBe("ap-southeast-2");
    expect(stripped.bucketNames).toBe("demo-bucket-1,demo-bucket-2");
    expect(stripped.scanLevel).toBe("deep");
  });
});

describe("saveSettings", () => {
  it("never writes credentials to localStorage", () => {
    saveSettings({ ...initialScanSettings, ...liveCreds });

    const raw = localStorage.getItem("scanSettings");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.accessKeyId).toBe("");
    expect(parsed.secretAccessKey).toBe("");
    expect(parsed.sessionToken).toBe("");
    expect(parsed.assumeRoleArn).toBe("");
    // Defence against substring leaks too: the raw JSON must not contain any
    // characters from the access key id.
    expect(raw).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(raw).not.toContain("wJalrXUtnFEMI");
  });
});

describe("loadSettings", () => {
  it("returns the fallback when no saved settings exist", () => {
    const result = loadSettings(initialScanSettings);
    expect(result).toEqual(initialScanSettings);
  });

  it("forces credential fields empty even if a tampered entry contains them", () => {
    // Simulate someone editing localStorage in devtools to plant credentials.
    localStorage.setItem(
      "scanSettings",
      JSON.stringify({
        ...initialScanSettings,
        ...liveCreds,
      }),
    );

    const result = loadSettings(initialScanSettings);
    expect(result.accessKeyId).toBe("");
    expect(result.secretAccessKey).toBe("");
    expect(result.sessionToken).toBe("");
    expect(result.assumeRoleArn).toBe("");
  });

  it("resets connection status so a stale 'Connected' badge cannot show without creds", () => {
    localStorage.setItem(
      "scanSettings",
      JSON.stringify({
        ...initialScanSettings,
        connectionStatus: "Connected",
        connectedAccount: "123456789012 / Admin",
      }),
    );

    const result = loadSettings(initialScanSettings);
    expect(result.connectionStatus).toBe("Pending");
    expect(result.connectedAccount).toBe("");
  });

  it("returns the fallback when the saved entry is malformed JSON", () => {
    localStorage.setItem("scanSettings", "{not valid json");
    const result = loadSettings(initialScanSettings);
    expect(result).toEqual(initialScanSettings);
  });

  it("preserves saved non-credential preferences across reload", () => {
    saveSettings({
      ...initialScanSettings,
      primaryRegion: "ap-southeast-2",
      bucketNames: "demo-bucket",
      scanLevel: "deep",
    });

    const result = loadSettings(initialScanSettings);
    expect(result.primaryRegion).toBe("ap-southeast-2");
    expect(result.bucketNames).toBe("demo-bucket");
    expect(result.scanLevel).toBe("deep");
  });
});
