import { Button } from "@/components/ui/button";

interface BottomActionBarProps {
  lastSaved: string;
  onReset: () => void;
  onSave: () => void;
  onRunScan: () => void;
}

export function BottomActionBar({
  lastSaved,
  onReset,
  onSave,
  onRunScan,
}: BottomActionBarProps) {
  return (
    <section className="sticky bottom-4 rounded-[1.35rem] border border-[#e2d6c1] bg-white/95 px-5 py-4 shadow-[0_12px_28px_rgba(120,93,57,0.10)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-[#7f715f]">{lastSaved}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-[#dfd2bc] bg-[#fcfaf6] text-[#5c4f40] hover:bg-[#f3ecdf]"
            onClick={onReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[#8b6949] text-white hover:bg-[#78583b]"
            onClick={onSave}
          >
            Save Settings
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[#7cc486] text-white hover:bg-[#67ae71]"
            onClick={onRunScan}
          >
            Run Scan
          </Button>
        </div>
      </div>
    </section>
  );
}
