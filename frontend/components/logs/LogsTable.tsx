"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchField } from "@/components/shared/SearchField";
import { SectionCard } from "@/components/shared/SectionCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logRecords } from "@/lib/mock-data";

export function LogsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const serviceOptions = Array.from(new Set(logRecords.map((entry) => entry.awsService)));

  const filtered = useMemo(
    () =>
      logRecords
        .filter((entry) => (levelFilter === "all" ? true : entry.level === levelFilter))
        .filter((entry) =>
          serviceFilter === "all" ? true : entry.awsService === serviceFilter,
        )
        .filter((entry) =>
          `${entry.event} ${entry.awsService}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        ),
    [levelFilter, searchQuery, serviceFilter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        subtitle="Filter execution history, inspect service-level events, and export logs."
        action={
          <Button className="h-11 rounded-xl bg-[#8b6949] px-5 text-white hover:bg-[#78583b]">
            <Download size={16} />
            Export Logs
          </Button>
        }
      />

      <SectionCard contentClassName="space-y-4 px-0 py-0">
        <div className="flex flex-col gap-4 border-b border-[#f0e7da] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterSelect
              value={levelFilter}
              onValueChange={setLevelFilter}
              placeholder="All Levels"
              options={[
                { value: "all", label: "All Levels" },
                { value: "INFO", label: "INFO" },
                { value: "WARN", label: "WARN" },
                { value: "ERROR", label: "ERROR" },
              ]}
            />
            <FilterSelect
              value={serviceFilter}
              onValueChange={setServiceFilter}
              placeholder="All Services"
              options={[
                { value: "all", label: "All Services" },
                ...serviceOptions.map((service) => ({ value: service, label: service })),
              ]}
            />
          </div>

          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search logs..."
            className="w-full max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#f5efe6]">
              <tr className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8d7b64]">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">AWS Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e7da]">
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 text-sm text-[#7f715f]">{entry.timestampLabel}</td>
                  <td className="px-6 py-4">
                    <SeverityBadge severity={entry.level.toLowerCase() as "info" | "warn" | "error"} />
                  </td>
                  <td className="px-6 py-4 text-sm text-[#45392d]">{entry.event}</td>
                  <td className="px-6 py-4 text-sm text-[#7f715f]">{entry.awsService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#f0e7da] px-6 py-4 text-sm text-[#7f715f]">
          Showing 1-{filtered.length} of {filtered.length} log entries
        </div>
      </SectionCard>
    </div>
  );
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11 min-w-[140px] rounded-xl border-[#e4d8c4] bg-[#fcfaf6]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
