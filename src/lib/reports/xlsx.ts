// src/lib/reports/xlsx.ts
// Professional-ish Excel for the daily PDI report using SheetJS (xlsx).
// Returns a Buffer. SheetJS on the free build can't do rich styling/fonts,
// so we focus on clean structure: a Summary sheet + a Readings sheet with
// column widths, an auto-filter, and a frozen header.

import * as XLSX from "xlsx";
import type { ReportRow } from "./data";

type Summary = { total: number; passed: number; failed: number; passPct: number };

function istStr(d: Date | null): string {
  if (!d) return "-";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().replace("T", " ").slice(0, 19);
}

export function buildDailyXlsx(istDate: string, rows: ReportRow[], summary: Summary): Buffer {
  const wb = XLSX.utils.book_new();

  // ---- Summary sheet ----
  const summaryAoa = [
    ["FREEZER PDI DAILY REPORT"],
    ["Report Date", istDate],
    ["Generated", istStr(new Date())],
    [],
    ["Total Tested", summary.total],
    ["Passed", summary.passed],
    ["Failed", summary.failed],
    ["Pass %", `${summary.passPct}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryAoa);
  ws1["!cols"] = [{ wch: 22 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  // ---- Data sheet ----
  const header = [
    "Freezer ID", "Model", "Station", "Test Time (IST)", "Duration (s)",
    "Voltage", "Current", "Power", "Gas", "Overall",
  ];
  const data = rows.map((r) => [
    r.freezerId,
    r.model ?? "-",
    r.station,
    istStr(r.completedAt),
    r.durationSeconds,
    r.voltageResult ?? "-",
    r.currentResult ?? "-",
    r.powerResult ?? "-",
    r.gasResult ?? "-",
    r.overallResult ?? "-",
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws2["!cols"] = [
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 12 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 10 },
  ];
  // freeze header row + auto filter over the table
  ws2["!freeze"] = { xSplit: 0, ySplit: 1 } as any;
  const lastCol = XLSX.utils.encode_col(header.length - 1);
  ws2["!autofilter"] = { ref: `A1:${lastCol}${data.length + 1}` };
  XLSX.utils.book_append_sheet(wb, ws2, "Readings");

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out as Buffer;
}
