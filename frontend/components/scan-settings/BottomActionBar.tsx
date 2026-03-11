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
    <section
      id="settings-actions"
      className="sticky bottom-4 rounded-lg border bg-white p-4 shadow-lg"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[#4a5d7a]">{lastSaved}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button
            type="button"
            className="bg-[#3d5a7e] text-white hover:bg-[#2c4564]"
            onClick={onSave}
          >
            Save Settings
          </Button>
          <Button
            type="button"
            className="bg-[#5fa75f] text-white hover:bg-[#4e8f4e]"
            onClick={onRunScan}
          >
            Run Scan
          </Button>
        </div>
      </div>
    </section>
  );
}
