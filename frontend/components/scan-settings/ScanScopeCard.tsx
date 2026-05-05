import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/SectionCard";
import { SettingsToggleRow } from "@/components/shared/SettingsToggleRow";
import type { RegionOption, RegionScope, ScanLevel, ScanSettingsState } from "@/lib/types";

interface ScanScopeCardProps {
  regions: RegionOption[];
  settings: ScanSettingsState;
  onValueChange: (
    field: keyof ScanSettingsState,
    value: string | number | boolean | string[],
  ) => void;
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
    <SectionCard
      title="Scan Scope"
      description="Control how broad and how deep the audit should be."
      className="h-full"
      contentClassName="space-y-5"
    >
      <LabeledSelect
        label="Scan Level"
        value={settings.scanLevel}
        onValueChange={(value) => onValueChange("scanLevel", value as ScanLevel)}
        options={[
          { value: "quick", label: "Quick Scan" },
          { value: "standard", label: "Standard Scan" },
          { value: "deep", label: "Deep Scan" },
        ]}
      />

      <LabeledSelect
        label="Region Scope"
        value={settings.regionScope}
        onValueChange={(value) => onValueChange("regionScope", value as RegionScope)}
        options={[
          { value: "single-region", label: "Single Region" },
          { value: "multi-region", label: "Multi Region" },
          { value: "all-enabled", label: "All Enabled Regions" },
        ]}
      />

      {settings.regionScope === "single-region" ? (
        <LabeledSelect
          label="Region"
          value={settings.singleRegion}
          onValueChange={(value) => onValueChange("singleRegion", value)}
          options={regions.map((region) => ({ value: region.value, label: region.label }))}
        />
      ) : null}

      {settings.regionScope === "multi-region" ? (
        <div className="space-y-3">
          <FieldLabel label="Regions" />
          <div className="grid gap-3 rounded-[1.15rem] border border-[#eadfcf] bg-[#fcfaf6] p-4 sm:grid-cols-2">
            {regions.map((region) => {
              const checked = settings.selectedRegions.includes(region.value);

              return (
                <label
                  key={region.value}
                  className="flex items-center gap-3 text-sm text-[#5e5144]"
                >
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
      ) : null}

      <div className="grid gap-2">
        <FieldLabel label="S3 Bucket Names (one per line)" />
        <textarea
          value={settings.bucketNames}
          onChange={(event) => onValueChange("bucketNames", event.target.value)}
          placeholder={"my-app-prod-logs\nstaging-uploads"}
          rows={3}
          className="rounded-xl border border-[#e4d8c4] bg-[#fcfaf6] px-3 py-2 text-sm text-[#5e5144] placeholder:text-[#bfae93] focus:outline-none focus:ring-2 focus:ring-[#cdb892]"
        />
        <p className="text-xs text-[#9a8a72]">
          Optional. Leave blank to scan every bucket in the account. Required if your IAM role
          denies <code className="rounded bg-[#f3ecdf] px-1 py-0.5">s3:ListAllMyBuckets</code>.
        </p>
      </div>

      <div className="grid gap-2">
        <FieldLabel label="Max Findings Per Service" />
        <Input
          type="number"
          min={1}
          value={settings.maxFindingsPerService}
          onChange={(event) =>
            onValueChange("maxFindingsPerService", Number(event.target.value) || 0)
          }
          className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]"
        />
      </div>

      <div className="space-y-4">
        <SettingsToggleRow
          title="Include Low Severity Findings"
          description="Keep informational and low-priority findings in scope."
          checked={settings.includeLowSeverity}
          onCheckedChange={(value) => onValueChange("includeLowSeverity", value)}
        />
        <SettingsToggleRow
          title="Stop Scan on Error"
          description="Abort the local run if a service-level check fails."
          checked={settings.stopOnError}
          onCheckedChange={(value) => onValueChange("stopOnError", value)}
        />
      </div>
    </SectionCard>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#987f62]">
      {label}
    </p>
  );
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel label={label} />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-[#e4d8c4] bg-[#fcfaf6]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
