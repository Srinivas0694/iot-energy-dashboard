// src/lib/reports/csv.ts
// Clean UTF-8 CSV for the daily PDI report. Returns a string (with BOM so
// Excel opens it with correct encoding).
import type { ReportRow } from "./data";

type Summary = { total: number; passed: number; failed: number; passPct: number };

function istStr(d: Date | null): string {
  if (!d) return "-";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().replace("T", " ").slice(0, 19);
}
function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildDailyCsv(istDate: string, rows: ReportRow[], summary: Summary): string {
  const header = [
    "Freezer ID", "Model", "Station", "Test Time (IST)", "Duration (s)",
    "Voltage", "Current", "Power", "Gas", "Overall",
  ];
  const lines: string[] = [];
  lines.push(`Freezer PDI Daily Report,${istDate}`);
  lines.push(`Total,${summary.total},Passed,${summary.passed},Failed,${summary.failed},Pass %,${summary.passPct}%`);
  lines.push("");
  lines.push(header.join(","));
  for (const r of rows) {
    lines.push([
      esc(r.freezerId), esc(r.model ?? "-"), esc(r.station), esc(istStr(r.completedAt)),
      esc(r.durationSeconds), esc(r.voltageResult ?? "-"), esc(r.currentResult ?? "-"),
      esc(r.powerResult ?? "-"), esc(r.gasResult ?? "-"), esc(r.overallResult ?? "-"),
    ].join(","));
  }
  return "\uFEFF" + lines.join("\r\n"); // BOM + CRLF for Excel
}
