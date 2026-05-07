import { Switch } from "@/components/ui/switch";

interface SettingsToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.15rem] border border-[#eadfcf] bg-[#fcfaf6] px-4 py-4">
      <div className="space-y-1">
        <p className="font-medium text-[#3a3127]">{title}</p>
        <p className="text-sm leading-5 text-[#81715d]">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
