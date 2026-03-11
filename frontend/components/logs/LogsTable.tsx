"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logRecords } from "@/lib/mock-data";
import type { LogLevel } from "@/lib/types";

const pageSize = 5;

const badgeClassByLevel: Record<LogLevel, string> = {
  INFO: "bg-[#5fa75f] text-white",
  WARN: "bg-[#f9a825] text-white",
  ERROR: "bg-[#e74c4c] text-white",
};

export function LogsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = logRecords
    .filter((entry) => (levelFilter === "all" ? true : entry.level === levelFilter))
    .filter((entry) =>
      serviceFilter === "all" ? true : entry.awsService === serviceFilter,
    )
    .filter((entry) =>
      `${entry.event} ${entry.awsService}`.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const sorted = [...filtered].sort((left, right) => {
    const delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return sortDirection === "asc" ? delta : -delta;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleLogs = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const serviceOptions = Array.from(new Set(logRecords.map((entry) => entry.awsService)));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1>Logs</h1>
          <p className="text-[#4a5d7a]">
            Filter execution history, inspect service-level events, and export mock logs.
          </p>
        </div>

        <Button className="bg-[#5fa75f] text-white hover:bg-[#4e8f4e]">
          Export Logs
          <Download size={18} />
        </Button>
      </header>

      <section className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[200px_200px_minmax(0,1fr)]">
          <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={(value) => setServiceFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceOptions.map((service) => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca7b5]" size={18} />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search logs..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#e8ecf1]">
              <tr className="text-left text-[#4a5d7a]">
                <th className="px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2"
                    onClick={() =>
                      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
                    }
                  >
                    Time
                    {sortDirection === "asc" ? (
                      <ArrowUp size={15} className="text-[#4a7bbd]" />
                    ) : (
                      <ArrowDown size={15} className="text-[#4a7bbd]" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">AWS Service</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-4 text-[#4a5d7a]">{entry.timestampLabel}</td>
                  <td className="px-4 py-4">
                    <Badge className={badgeClassByLevel[entry.level]}>{entry.level}</Badge>
                  </td>
                  <td className="px-4 py-4 text-[#4a5d7a]">{entry.event}</td>
                  <td className="px-4 py-4 text-[#4a5d7a]">{entry.awsService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t pt-4 text-[#4a5d7a] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {(safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, sorted.length)} of {sorted.length} log entries
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft size={18} />
            </Button>
            <span className="rounded-md bg-[#4a7bbd] px-3 py-2 text-white">
              {safePage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
