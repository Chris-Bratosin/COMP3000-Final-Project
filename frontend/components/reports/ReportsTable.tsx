"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FilePlus2 } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchField } from "@/components/shared/SearchField";
import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { reportRecords } from "@/lib/mock-data";

const pageSize = 5;

export function ReportsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(
    () =>
      reportRecords.filter((report) =>
        report.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleReports = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Review generated scan summaries, issue counts, and export actions."
        action={
          <Button className="h-11 rounded-xl bg-[#8b6949] px-5 text-white hover:bg-[#78583b]">
            <FilePlus2 size={16} />
            Generate Report
          </Button>
        }
      />

      <SectionCard
        title="Saved Reports"
        description={`${reportRecords.length} reports available.`}
        actions={
          <SearchField
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            placeholder="Search reports..."
            className="w-full min-w-[280px] max-w-sm"
          />
        }
        contentClassName="overflow-hidden px-0 py-0"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#f5efe6]">
              <tr className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#8d7b64]">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Report Name</th>
                <th className="px-6 py-4 text-center">Issues</th>
                <th className="px-6 py-4 text-center">High</th>
                <th className="px-6 py-4 text-center">Medium</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e7da]">
              {visibleReports.map((report) => (
                <tr key={report.id} className="bg-white">
                  <td className="px-6 py-4 text-sm text-[#7f715f]">{report.dateLabel}</td>
                  <td className="px-6 py-4 font-medium text-[#352d24]">{report.name}</td>
                  <td className="px-6 py-4 text-center font-semibold text-[#352d24]">
                    {report.issues}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-[#e36a63]">
                    {report.high}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-[#ea9b39]">
                    {report.medium}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-[#e0d3bd] bg-[#fcfaf6] text-[#4a4034] hover:bg-[#f3ecdf]"
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        className="rounded-xl bg-[#7ac77f] text-white hover:bg-[#66b06b]"
                      >
                        <Download size={16} />
                        Export
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#f0e7da] px-6 py-4 text-sm text-[#7f715f] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {(safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} reports
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
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
