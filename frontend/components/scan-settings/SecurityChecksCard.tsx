import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type {
  SecurityCheckCategory,
  SecurityCheckOption,
  ScanSettingsState,
} from "@/lib/types";

interface SecurityChecksCardProps {
  categories: SecurityCheckCategory[];
  options: SecurityCheckOption[];
  settings: ScanSettingsState;
  onToggle: (checkId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onRecommendedOnly: () => void;
}

export function SecurityChecksCard({
  categories,
  options,
  settings,
  onToggle,
  onSelectAll,
  onClearAll,
  onRecommendedOnly,
}: SecurityChecksCardProps) {
  const optionMap = Object.fromEntries(options.map((option) => [option.id, option]));

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2>Security Checks</h2>
          <p className="max-w-3xl text-[#4a5d7a]">
            Select which services and misconfiguration rules should be included in this scan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onSelectAll}>
            Select All
          </Button>
          <Button type="button" variant="outline" onClick={onClearAll}>
            Clear All
          </Button>
          <Button type="button" className="bg-[#3d5a7e] text-white hover:bg-[#2c4564]" onClick={onRecommendedOnly}>
            Recommended Only
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border bg-[#f5f7fa] p-4">
            <h3 className="mb-4">{category.title}</h3>
            <div className="grid gap-3">
              {category.checkIds.map((checkId) => {
                const option = optionMap[checkId];
                const checked = settings.securityChecks[checkId];

                return (
                  <label key={checkId} className="flex items-start gap-3 text-[#4a5d7a]">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => onToggle(checkId, Boolean(value))}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
