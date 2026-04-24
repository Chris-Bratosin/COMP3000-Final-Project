import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a79277]"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border-[#e4d8c4] bg-[#f6f0e6] pl-10 text-[#4a4136] placeholder:text-[#a79277]"
      />
    </div>
  );
}
