"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportRecords } from "@/lib/mock-data";

type SortKey = "createdAt" | "issues" | "high" | "medium";

const pageSize = 5;

export function ReportsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  };

  const filtered = reportRecords.filter((report) =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sorted = [...filtered].sort((left, right) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "createdAt") {
      return (
        (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) *
        direction
      );
    }

    return (left[sortKey] - right[sortKey]) * direction;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleReports = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const sortIcon = (key: SortKey) =>
    sortKey !== key ? (
      <ArrowDown size={15} className="text-[#9ca7b5]" />
    ) : sortDirection === "asc" ? (
      <ArrowUp size={15} className="text-[#4a7bbd]" />
    ) : (
      <ArrowDown size={15} className="text-[#4a7bbd]" />
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1>Reports</h1>
          <p className="text-[#4a5d7a]">
            Review generated scan summaries, issue counts, and export actions.
          </p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca7b5]" size={18} />
          <Input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search reports..."
            className="pl-10"
          />
        </div>
      </header>

      <section className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#e8ecf1]">
              <tr className="text-left text-[#4a5d7a]">
                <th className="px-4 py-3">
                  <button type="button" className="inline-flex items-center gap-2" onClick={() => handleSort("createdAt")}>
                    Date
                    {sortIcon("createdAt")}
                  </button>
                </th>
                <th className="px-4 py-3">Report Name</th>
                <th className="px-4 py-3 text-center">
                  <button type="button" className="inline-flex items-center gap-2" onClick={() => handleSort("issues")}>
                    Issues
                    {sortIcon("issues")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button type="button" className="inline-flex items-center gap-2" onClick={() => handleSort("high")}>
                    High
                    {sortIcon("high")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button type="button" className="inline-flex items-center gap-2" onClick={() => handleSort("medium")}>
                    Medium
                    {sortIcon("medium")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleReports.map((report) => (
                <tr key={report.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-4 text-[#4a5d7a]">{report.dateLabel}</td>
                  <td className="px-4 py-4 font-medium text-[#2c4564]">{report.name}</td>
                  <td className="px-4 py-4 text-center text-xl font-semibold text-[#4a7bbd]">
                    {report.issues}
                  </td>
                  <td className="px-4 py-4 text-center text-xl font-semibold text-[#e74c4c]">
                    {report.high}
                  </td>
                  <td className="px-4 py-4 text-center text-xl font-semibold text-[#f9a825]">
                    {report.medium}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Button className="bg-[#4a7bbd] text-white hover:bg-[#3d5a7e]">
                        View
                      </Button>
                      <Button className="bg-[#5fa75f] text-white hover:bg-[#4e8f4e]">
                        <Download size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t px-4 py-4 text-[#4a5d7a] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {(safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, sorted.length)} of {sorted.length} reports
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
