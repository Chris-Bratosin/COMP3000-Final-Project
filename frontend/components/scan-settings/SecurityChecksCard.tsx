import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/shared/SectionCard";
import type {
  ScanSettingsState,
  SecurityCheckCategory,
  SecurityCheckOption,
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
    <SectionCard
      title="Security Checks"
      description="Select which services and misconfiguration rules should be included in this scan."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-[#dfd2bc] bg-[#fcfaf6] text-[#5b4e40] hover:bg-[#f3ecdf]"
            onClick={onSelectAll}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-[#dfd2bc] bg-[#fcfaf6] text-[#5b4e40] hover:bg-[#f3ecdf]"
            onClick={onClearAll}
          >
            Clear All
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[#8b6949] text-white hover:bg-[#78583b]"
            onClick={onRecommendedOnly}
          >
            Recommended Only
          </Button>
        </div>
      }
      className="xl:col-span-2"
      contentClassName="grid gap-4 md:grid-cols-2"
    >
      {categories.map((category) => (
        <article
          key={category.id}
          className="rounded-[1.15rem] border border-[#eadfcf] bg-[#fcfaf6] p-4"
        >
          <h3 className="mb-4 text-lg font-semibold text-[#392f25]">{category.title}</h3>
          <div className="space-y-3">
            {category.checkIds.map((checkId) => {
              const option = optionMap[checkId];
              const checked = settings.securityChecks[checkId];

              return (
                <label
                  key={checkId}
                  className="flex items-start gap-3 text-sm leading-6 text-[#5c5043]"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => onToggle(checkId, Boolean(value))}
                    className="mt-1"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </article>
      ))}
    </SectionCard>
  );
}
