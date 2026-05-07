"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

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
import { loadScanResult, mapScanToLogs } from "@/lib/scan";
import type { LogRecord } from "@/lib/types";

const pageSize = 5;

export function LogsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [liveLogs, setLiveLogs] = useState<LogRecord[]>([]);

  useEffect(() => {
    const scan = loadScanResult();
    if (scan) setLiveLogs(mapScanToLogs(scan));
  }, []);

  const allRecords = useMemo(
    () => (liveLogs.length > 0 ? liveLogs : logRecords),
    [liveLogs],
  );

  const serviceOptions = useMemo(
    () => Array.from(new Set(allRecords.map((entry) => entry.awsService))),
    [allRecords],
  );

  const filtered = useMemo(
    () =>
      allRecords
        .filter((entry) => (levelFilter === "all" ? true : entry.level === levelFilter))
        .filter((entry) =>
          serviceFilter === "all" ? true : entry.awsService === serviceFilter,
        )
        .filter((entry) =>
          `${entry.event} ${entry.awsService}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        ),
    [allRecords, levelFilter, searchQuery, serviceFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleLogs = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startEntry = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, filtered.length);

  const handleExportLogs = () => {
    if (filtered.length === 0) {
      alert("No log entries to export.");
      return;
    }

    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const rowColor = (level: string) => {
      switch (level.toUpperCase()) {
        case "ERROR": return "#f8c9c9";
        case "WARN":  return "#fde0c0";
        case "INFO":
        default:      return "#cfe2f3";
      }
    };

    const textColor = (level: string) =>
      level.toUpperCase() === "ERROR" ? "#9c1c1c" : "#000000";

    const rows = filtered
      .map((entry) => {
        const bg = rowColor(entry.level);
        const fg = textColor(entry.level);
        const cellStyle = `border:1px solid #000;padding:4px 8px;background:${bg};color:${fg};`;
        return `<tr>
          <td style="${cellStyle}">${escapeHtml(entry.timestampLabel)}</td>
          <td style="${cellStyle}">${escapeHtml(entry.level)}</td>
          <td style="${cellStyle}">${escapeHtml(entry.event)}</td>
          <td style="${cellStyle}">${escapeHtml(entry.awsService)}</td>
        </tr>`;
      })
      .join("");

    const headerStyle =
      "border:1px solid #000;padding:6px 8px;background:#e5e5e5;font-weight:700;text-align:left;";

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]><xml>
    <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>CMA Logs</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
  </xml><![endif]-->
</head>
<body>
  <table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">
    <thead>
      <tr>
        <th style="${headerStyle}">Time</th>
        <th style="${headerStyle}">Level</th>
        <th style="${headerStyle}">Event</th>
        <th style="${headerStyle}">AWS Service</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const blob = new Blob(["﻿" + html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cma-logs-${stamp}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        subtitle="Filter execution history, inspect service-level events, and export logs."
        action={
          <Button
            onClick={handleExportLogs}
            className="h-11 rounded-xl bg-[#8b6949] px-5 text-white hover:bg-[#78583b]"
          >
            <Download size={16} />
            Export Logs
          </Button>
        }
      />

      {liveLogs.length > 0 && (
        <section className="rounded-[1.35rem] border border-[#cfe6d2] bg-[#eef7f0] px-5 py-4 shadow-[0_8px_24px_rgba(40,90,60,0.05)]">
          <p className="text-sm font-semibold text-[#2f6a3d]">Live scan logs</p>
          <p className="text-sm text-[#456a4d]">
            {liveLogs.length} entries from your last scan are shown at the top.
          </p>
        </section>
      )}

      <SectionCard contentClassName="space-y-4 px-0 py-0">
        <div className="flex flex-col gap-4 border-b border-[#f0e7da] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterSelect
              value={levelFilter}
              onValueChange={(value) => {
                setLevelFilter(value);
                setCurrentPage(1);
              }}
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
              onValueChange={(value) => {
                setServiceFilter(value);
                setCurrentPage(1);
              }}
              placeholder="All Services"
              options={[
                { value: "all", label: "All Services" },
                ...serviceOptions.map((service) => ({ value: service, label: service })),
              ]}
            />
          </div>

          <SearchField
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
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
              {visibleLogs.map((entry) => (
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

        <div className="flex flex-col gap-4 border-t border-[#f0e7da] px-6 py-4 text-sm text-[#7f715f] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {startEntry}-{endEntry} of {filtered.length} log entries
            {filtered.length !== allRecords.length ? ` (${allRecords.length} total)` : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous log page"
              className="rounded-xl border-[#dfd2bc] bg-[#fcfaf6] text-[#5c4f40] hover:bg-[#f3ecdf]"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#8b6949] px-3 text-sm font-semibold text-white">
              {safePage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next log page"
              className="rounded-xl border-[#dfd2bc] bg-[#fcfaf6] text-[#5c4f40] hover:bg-[#f3ecdf]"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
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
