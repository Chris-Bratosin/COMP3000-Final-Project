"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchField } from "@/components/shared/SearchField";
import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { reportRecords } from "@/lib/mock-data";
import {
  fetchScanHistory,
  groupScansByRunId,
  loadScanResult,
  mapScanToReport,
  mergeScanResults,
} from "@/lib/scan";
import type { BackendScanResult } from "@/lib/scan";
import { loadSettings } from "@/lib/scan-settings-storage";
import { initialScanSettings } from "@/lib/mock-data";
import type { OutputFormat, ReportRecord } from "@/lib/types";

const pageSize = 5;

// Slugify the report name for use in download filenames. Strips anything that
// isn't a letter, digit, dash, or underscore so the resulting filename is
// safe across Windows / macOS / Linux without quoting.
function safeFilenameSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "scan-report";
}

// Triggers a browser download by anchor click. Used for the JSON export so the
// file lands in the user's Downloads folder rather than opening a new tab.
function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// JSON export: pretty-printed BackendScanResult, downloaded as <name>.json.
// We export the raw scan envelope (findings, summary, region, runId, etc.)
// so a downstream tool can re-process the result without losing fidelity.
function exportScanAsJson(scan: BackendScanResult, reportName: string): void {
  const json = JSON.stringify(scan, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerDownload(`${safeFilenameSlug(reportName)}.json`, blob);
}

// HTML export: opens a printable A4 report in a new tab. The "Save as PDF"
// button inside the document calls window.print() so the user can save it
// through the browser's native print-to-PDF flow. Returns false if the new
// tab was blocked by pop-up settings.
function exportScanAsHtml(scan: BackendScanResult, reportName: string): boolean {
  const { findings } = scan;

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    const s = f.severity.toLowerCase();
    if (s === "critical" || s === "high" || s === "medium" || s === "low") {
      counts[s as keyof typeof counts]++;
    }
  }

  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const rowsFormatted = findings.map((f) => `
      <tr>
        <td class="sev"><strong>${escapeHtml(f.severity.charAt(0).toUpperCase() + f.severity.slice(1).toLowerCase())}</strong></td>
        <td>${escapeHtml(f.resourceId)}</td>
        <td>${escapeHtml(f.title)}</td>
        <td>${escapeHtml(f.remediation || "—")}</td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AWS Security Audit Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #111; padding: 24px 0; font-size: 14px; }
    .page { background: #fff; border: 1px solid #d4d4d4; padding: 0; width: 210mm; min-height: 297mm; margin: 0 auto; }
    .header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; padding: 24px 32px; border-bottom: 1px solid #d4d4d4; }
    .header .meta { font-size: 13px; line-height: 1.7; color: #111; }
    .header h1 { font-size: 18px; font-weight: 700; text-align: center; text-decoration: underline; white-space: nowrap; }
    .header .actions { text-align: right; }
    .save-btn { padding: 14px 22px; background: #cfe1f5; color: #0a0a0a; border: 1px solid #9bb6d4; border-radius: 4px; font-size: 16px; font-weight: 700; cursor: pointer; }
    .save-btn:hover { background: #b9d2ed; }
    .content { padding: 28px 32px 40px; }
    h2 { font-size: 16px; font-weight: 700; text-decoration: underline; margin-bottom: 18px; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 36px; }
    .summary-card { border: 1px solid #d4d4d4; border-radius: 6px; padding: 18px 12px; text-align: center; }
    .summary-card .count { font-size: 26px; font-weight: 700; }
    .summary-card .label { font-size: 12px; color: #555; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #d4d4d4; }
    th, td { padding: 12px 14px; border: 1px solid #d4d4d4; vertical-align: top; text-align: left; }
    th { background: #f3f3f3; font-weight: 700; }
    td.sev { width: 90px; }
    .empty { padding: 24px; text-align: center; color: #6b7280; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { border: none; width: 210mm; min-height: 297mm; margin: 0; }
      .save-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="meta">
        <div>Generated: ${escapeHtml(new Date().toLocaleString("en-GB"))}</div>
        <div>Scan region: ${escapeHtml(scan.region)}</div>
        <div>${escapeHtml(reportName)}</div>
      </div>
      <h1>AWS Security Audit Report</h1>
      <div class="actions">
        <button class="save-btn" onclick="window.print()">Save as PDF</button>
      </div>
    </div>

    <div class="content">
      <h2>Summary</h2>
      <div class="summary">
        <div class="summary-card"><div class="count">${findings.length}</div><div class="label">Total Findings</div></div>
        <div class="summary-card"><div class="count">${counts.critical}</div><div class="label">Critical</div></div>
        <div class="summary-card"><div class="count">${counts.high}</div><div class="label">High</div></div>
        <div class="summary-card"><div class="count">${counts.medium}</div><div class="label">Medium</div></div>
        <div class="summary-card"><div class="count">${counts.low}</div><div class="label">Low</div></div>
      </div>

      ${findings.length === 0
        ? '<div class="empty">No findings recorded for this scan.</div>'
        : `<table>
            <thead><tr><th>Severity</th><th>Resource</th><th>Issue</th><th>Remediation</th></tr></thead>
            <tbody>${rowsFormatted}</tbody>
          </table>`}
    </div>
  </div>
</body>
</html>`;

  const newWindow = window.open("about:blank", "_blank");
  if (!newWindow) return false;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  newWindow.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export function ReportsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [liveReport, setLiveReport] = useState<ReportRecord | null>(null);
  const [historyReports, setHistoryReports] = useState<ReportRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [scansById, setScansById] = useState<Record<string, BackendScanResult>>({});

  useEffect(() => {
    const scan = loadScanResult();
    if (scan) {
      const report = mapScanToReport(scan);
      setLiveReport(report);
      setScansById((prev) => ({ ...prev, [report.id]: scan }));
    }

    fetchScanHistory()
      .then((scans) => {
        // Each Run Scan click can produce up to four backend records (S3, IAM,
        // EC2, Secrets). Group by the runId stamped on every record at the
        // start of the click and merge each group so the table shows one row
        // per click. Legacy records without a runId fall through as singletons.
        const clusters = groupScansByRunId(scans);
        const mapped = clusters.map((cluster, i) => {
          const merged = mergeScanResults(cluster);
          return {
            report: {
              ...mapScanToReport(merged),
              id: merged.runId ?? `scan-${merged.completedAt}-${i}`,
            },
            scan: merged,
          };
        });
        setHistoryReports(mapped.map((m) => m.report));
        setScansById((prev) => {
          const next = { ...prev };
          for (const m of mapped) next[m.report.id] = m.scan;
          return next;
        });
        setHistoryError(null);
      })
      .catch((error: Error) => {
        setHistoryError(error.message);
      });
  }, []);

  const handleExportReport = (reportId: string) => {
    const scan = scansById[reportId];
    if (!scan) {
      alert("No scan data found for this report.");
      return;
    }

    const report = mapScanToReport(scan);
    // Use whatever Output Format the user saved; fall back to HTML if no
    // settings have been saved yet (first visit, fresh localStorage).
    const settings = loadSettings(initialScanSettings);
    const format: OutputFormat = settings.outputFormat || "html";

    const wantsHtml = format === "html" || format === "json-html";
    const wantsJson = format === "json" || format === "json-html";

    if (wantsJson) {
      exportScanAsJson(scan, report.name);
    }
    if (wantsHtml) {
      const opened = exportScanAsHtml(scan, report.name);
      if (!opened) {
        alert(
          "The HTML report could not be opened. Please allow pop-ups for this site and try again.",
        );
      }
    }
  };

  const allReports = useMemo(() => {
    const merged: ReportRecord[] = [];
    if (liveReport) merged.push(liveReport);
    for (const r of historyReports) {
      if (liveReport && r.createdAt === liveReport.createdAt) continue;
      merged.push(r);
    }
    if (merged.length > 0) return merged;
    return reportRecords;
  }, [liveReport, historyReports]);

  const filtered = useMemo(
    () =>
      allReports.filter((report) =>
        report.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [allReports, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleReports = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Review generated scan summaries, issue counts, and export actions. Click Export on any report to download the PDF."
      />

      {historyError && (
        <section className="rounded-[1.35rem] border border-[#ead7c4] bg-[#fdf4e9] px-5 py-3 text-sm text-[#8a6132]">
          Scan history is unavailable: {historyError}. Showing the latest in-memory scan only.
        </section>
      )}

      <SectionCard
        title="Saved Reports"
        description={`${allReports.length} report${allReports.length === 1 ? "" : "s"} available.`}
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
                  <td className="px-6 py-4 font-medium text-[#352d24]">
                    <span className="flex items-center gap-2">
                      {report.name}
                      {report.id === "live-scan" && (
                        <span className="rounded-md bg-[#eef7f0] px-2 py-0.5 text-xs font-semibold text-[#2f6a3d]">
                          Live
                        </span>
                      )}
                    </span>
                  </td>
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
                        onClick={() => handleExportReport(report.id)}
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
