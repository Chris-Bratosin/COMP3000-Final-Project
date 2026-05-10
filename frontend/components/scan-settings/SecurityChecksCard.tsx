import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/shared/SectionCard";
import type {
  ScanSettingsState,
  SecurityCheckCategory,
  SecurityCheckOption,
} from "@/lib/types";

// Categories whose scanners are wired up on the backend. Anything not in this
// set is rendered with a "Not yet implemented" badge and disabled checkboxes.
const IMPLEMENTED_CATEGORY_IDS = new Set(["s3", "iam", "network", "secrets"]);

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
      {categories.map((category) => {
        const implemented = IMPLEMENTED_CATEGORY_IDS.has(category.id);
        return (
          <article
            key={category.id}
            className={`rounded-[1.15rem] border p-4 ${
              implemented
                ? "border-[#eadfcf] bg-[#fcfaf6]"
                : "border-[#ebe2d4] bg-[#f5f0e6] opacity-70"
            }`}
          >
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#392f25]">{category.title}</h3>
              {!implemented && (
                <span className="rounded-full bg-[#e9dfc9] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#7a6a4f]">
                  Not yet implemented
                </span>
              )}
            </div>
            <div className="space-y-3">
              {category.checkIds.map((checkId) => {
                const option = optionMap[checkId];
                const checked = settings.securityChecks[checkId];

                return (
                  <label
                    key={checkId}
                    className={`flex items-start gap-3 text-sm leading-6 ${
                      implemented ? "text-[#5c5043]" : "text-[#8a7d68]"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!implemented}
                      onCheckedChange={(value) => onToggle(checkId, Boolean(value))}
                      className="mt-1"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </article>
        );
      })}
    </SectionCard>
  );
}
