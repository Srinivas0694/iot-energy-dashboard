import ExcelJS from "exceljs";
import type { Reading, SummaryStats } from "../types";
import { format } from "date-fns";

interface ExcelOptions {
  deviceLabel: string;
  rangeLabel: string;
  from: Date;
  to: Date;
  summary: SummaryStats;
}

const BRAND = "2563EB";

/** Build a styled .xlsx workbook with a report header, summary, and data table. */
export async function buildExcel(
  readings: Reading[],
  opts: ExcelOptions,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IoT Energy Dashboard";
  wb.created = new Date();

  const ws = wb.addWorksheet("Energy Report", {
    views: [{ state: "frozen", ySplit: 8 }],
  });
  ws.columns = [
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  // ---- Report header ----
  ws.mergeCells("A1:E1");
  const title = ws.getCell("A1");
  title.value = "IoT Energy Monitoring — Report";
  title.font = { name: "Poppins", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = `Device: ${opts.deviceLabel}    •    Range: ${opts.rangeLabel}`;
  ws.getCell("A2").font = { name: "Poppins", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("A3:E3");
  ws.getCell("A3").value =
    `Period: ${format(opts.from, "dd MMM yyyy HH:mm")} — ${format(opts.to, "dd MMM yyyy HH:mm")}`;
  ws.getCell("A3").font = { name: "Poppins", size: 10, color: { argb: "FF475569" } };

  // ---- Summary block ----
  const s = opts.summary;
  const summaryPairs: [string, string][] = [
    ["Avg Voltage", `${s.avgVoltage.toFixed(2)} V`],
    ["Avg Current", `${s.avgCurrent.toFixed(2)} A`],
    ["Total Energy", `${s.totalEnergy.toFixed(2)} kWh`],
    ["Peak Power", `${s.peakPower.toFixed(2)} W`],
    ["Min Voltage", `${s.minVoltage.toFixed(2)} V`],
    ["Max Voltage", `${s.maxVoltage.toFixed(2)} V`],
  ];
  ws.getCell("A5").value = "Summary";
  ws.getCell("A5").font = { name: "Poppins", size: 12, bold: true };
  summaryPairs.forEach(([label, val], i) => {
    const col = i % 3;
    const row = 6 + Math.floor(i / 3);
    const labelCell = ws.getCell(row, col * 2 + 1);
    const valCell = ws.getCell(row, col * 2 + 2);
    labelCell.value = label;
    labelCell.font = { name: "Poppins", size: 9, color: { argb: "FF64748B" } };
    valCell.value = val;
    valCell.font = { name: "Poppins", size: 10, bold: true };
  });

  // ---- Table header ----
  const headerRow = ws.getRow(9);
  ["Timestamp", "Current (A)", "Voltage (V)", "Power (W)", "Energy (kWh)"].forEach(
    (h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: "Poppins", bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: i === 0 ? "left" : "right" };
    },
  );
  headerRow.height = 20;

  // ---- Data rows ----
  readings.forEach((r, idx) => {
    const row = ws.addRow([
      format(new Date(r.timestamp), "yyyy-MM-dd HH:mm:ss"),
      Number(r.current.toFixed(3)),
      Number(r.voltage.toFixed(2)),
      Number(r.power.toFixed(2)),
      Number(r.energy.toFixed(3)),
    ]);
    row.eachCell((cell, col) => {
      cell.font = { name: "Poppins", size: 10 };
      cell.alignment = { horizontal: col === 1 ? "left" : "right" };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      }
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
