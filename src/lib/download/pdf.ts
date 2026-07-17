import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Reading, SummaryStats } from "../types";
import { format } from "date-fns";

interface PdfOptions {
  deviceLabel: string;
  rangeLabel: string;
  from: Date;
  to: Date;
  summary: SummaryStats;
}

const BRAND: [number, number, number] = [37, 99, 235];
const SLATE: [number, number, number] = [30, 41, 59];

/** Build a branded PDF report (logo placeholder, title, range, summary, table). */
export function buildPdf(readings: Reading[], opts: PdfOptions): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // ---- Header band ----
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 70, "F");

  // Logo placeholder (swap for your company logo)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 18, 34, 34, 6, 6, "F");
  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("⚡", margin + 10, 41);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("IoT Energy Monitoring — Report", margin + 48, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Device: ${opts.deviceLabel}   •   Range: ${opts.rangeLabel}`, margin + 48, 52);

  // ---- Meta line ----
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text(
    `Period: ${format(opts.from, "dd MMM yyyy HH:mm")} — ${format(opts.to, "dd MMM yyyy HH:mm")}`,
    margin,
    92,
  );
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, margin, 106);

  // ---- Summary cards ----
  const s = opts.summary;
  const cards: [string, string][] = [
    ["Avg Voltage", `${s.avgVoltage.toFixed(2)} V`],
    ["Avg Current", `${s.avgCurrent.toFixed(2)} A`],
    ["Total Energy", `${s.totalEnergy.toFixed(2)} kWh`],
    ["Peak Power", `${s.peakPower.toFixed(2)} W`],
    ["Min Voltage", `${s.minVoltage.toFixed(2)} V`],
    ["Max Voltage", `${s.maxVoltage.toFixed(2)} V`],
  ];
  const cardW = (pageW - margin * 2 - 10 * 2) / 3;
  const cardH = 44;
  let cx = margin;
  let cy = 122;
  cards.forEach(([label, val], i) => {
    if (i > 0 && i % 3 === 0) {
      cy += cardH + 10;
      cx = margin;
    }
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, cy, cardW, cardH, 5, 5, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), cx + 10, cy + 16);
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(val, cx + 10, cy + 34);
    doc.setFont("helvetica", "normal");
    cx += cardW + 10;
  });

  // ---- Data table ----
  autoTable(doc, {
    startY: cy + cardH + 24,
    head: [["Timestamp", "Current (A)", "Voltage (V)", "Power (W)", "Energy (kWh)"]],
    body: readings.map((r) => [
      format(new Date(r.timestamp), "yyyy-MM-dd HH:mm:ss"),
      r.current.toFixed(3),
      r.voltage.toFixed(2),
      r.power.toFixed(2),
      r.energy.toFixed(3),
    ]),
    theme: "striped",
    headStyles: { fillColor: SLATE, textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `IoT Energy Dashboard  •  Page ${page}`,
        pageW - margin,
        doc.internal.pageSize.getHeight() - 16,
        { align: "right" },
      );
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
