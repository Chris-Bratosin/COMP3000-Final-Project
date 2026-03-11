import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { RegionOption, RegionScope, ScanLevel, ScanSettingsState } from "@/lib/types";

interface ScanScopeCardProps {
  regions: RegionOption[];
  settings: ScanSettingsState;
  onValueChange: (field: keyof ScanSettingsState, value: string | number | boolean | string[]) => void;
}

export function ScanScopeCard({
  regions,
  settings,
  onValueChange,
}: ScanScopeCardProps) {
  const toggleRegion = (regionValue: string, checked: boolean) => {
    const nextRegions = checked
      ? [...settings.selectedRegions, regionValue]
      : settings.selectedRegions.filter((value) => value !== regionValue);

    onValueChange("selectedRegions", nextRegions);
  };

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <h2>Scan Scope</h2>
        <p className="text-[#4a5d7a]">
          Control how broad and how deep the audit should be.
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label>Scan Level</label>
          <Select
            value={settings.scanLevel}
            onValueChange={(value) => onValueChange("scanLevel", value as ScanLevel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quick">Quick Scan</SelectItem>
              <SelectItem value="standard">Standard Scan</SelectItem>
              <SelectItem value="deep">Deep Scan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label>Region Scope</label>
          <Select
            value={settings.regionScope}
            onValueChange={(value) => onValueChange("regionScope", value as RegionScope)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single-region">Single Region</SelectItem>
              <SelectItem value="multi-region">Multi Region</SelectItem>
              <SelectItem value="all-enabled">All Enabled Regions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.regionScope === "single-region" && (
          <div className="grid gap-2">
            <label>Region</label>
            <Select
              value={settings.singleRegion}
              onValueChange={(value) => onValueChange("singleRegion", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {settings.regionScope === "multi-region" && (
          <div className="grid gap-3">
            <label>Regions</label>
            <div className="grid gap-3 rounded-lg border bg-[#f5f7fa] p-4 sm:grid-cols-2">
              {regions.map((region) => {
                const checked = settings.selectedRegions.includes(region.value);

                return (
                  <label key={region.value} className="flex items-center gap-3 text-[#4a5d7a]">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleRegion(region.value, Boolean(value))}
                    />
                    <span>{region.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <label htmlFor="max-findings">Max Findings Per Service</label>
          <Input
            id="max-findings"
            type="number"
            min={1}
            value={settings.maxFindingsPerService}
            onChange={(event) =>
              onValueChange("maxFindingsPerService", Number(event.target.value) || 0)
            }
          />
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between rounded-lg border bg-[#f5f7fa] px-4 py-3">
            <div>
              <p className="font-medium text-[#2c4564]">Include Low Severity Findings</p>
              <p className="text-[#4a5d7a]">Keep informational and low-priority findings in scope.</p>
            </div>
            <Switch
              checked={settings.includeLowSeverity}
              onCheckedChange={(value) => onValueChange("includeLowSeverity", value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-[#f5f7fa] px-4 py-3">
            <div>
              <p className="font-medium text-[#2c4564]">Stop Scan on Error</p>
              <p className="text-[#4a5d7a]">Abort the local run if a service-level check fails.</p>
            </div>
            <Switch
              checked={settings.stopOnError}
              onCheckedChange={(value) => onValueChange("stopOnError", value)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
