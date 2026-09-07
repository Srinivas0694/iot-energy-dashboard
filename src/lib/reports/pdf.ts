// src/lib/reports/pdf.ts
// Server-side PDF for the daily PDI report. pdfkit + embedded Poppins.
// FIXES: use a fixed MARGIN constant (not doc.page.margin), no emoji glyphs,
// all text widths guarded so pdfkit never receives NaN.

// @ts-ignore
import PDFDocument from "pdfkit";
import path from "path";
import type { ReportRow } from "./data";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const F = {
  reg: path.join(FONT_DIR, "Poppins-Regular.ttf"),
  med: path.join(FONT_DIR, "Poppins-Medium.ttf"),
  sb: path.join(FONT_DIR, "Poppins-SemiBold.ttf"),
  b: path.join(FONT_DIR, "Poppins-Bold.ttf"),
};

const NAVY = "#0b1a40";
const ACCENT = "#2563eb";
const GREEN = "#16a34a";
const RED = "#dc2626";
const INK = "#0f172a";
const SUB = "#64748b";
const LINE = "#cbd5e1";
const ZEBRA = "#f1f5f9";
const REDBG = "#fef2f2";

const MARGIN = 40; // fixed page margin

type Summary = { total: number; passed: number; failed: number; passPct: number };

function fmtDateTime(d: Date | null): string {
  if (!d) return "-";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().replace("T", " ").slice(0, 19) + " IST";
}
function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function buildDailyPdf(istDate: string, rows: ReportRow[], summary: Summary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("reg", F.reg);
      doc.registerFont("med", F.med);
      doc.registerFont("sb", F.sb);
      doc.registerFont("b", F.b);

      const pageW = doc.page.width;
      const left = MARGIN;
      const right = pageW - MARGIN;
      const contentW = right - left;
      const now = new Date();

      // ---------- HEADER ----------
      doc.rect(0, 0, pageW, 96).fill(NAVY);
      doc.fillColor("#ffffff").font("b").fontSize(22).text("FREEZER PDI DAILY REPORT", left, 26, { width: contentW });
      doc.fillColor("#9db2d9").font("med").fontSize(11).text("Pre-Delivery Inspection  -  Daily Quality Summary", left, 56, { width: contentW });
      doc.fillColor("#cdd8ef").font("reg").fontSize(9).text(`Report Date: ${istDate}`, left, 76, { width: contentW / 2 });
      doc.fillColor("#cdd8ef").font("reg").fontSize(9).text(`Generated: ${fmtDateTime(now)}`, left + contentW / 2, 76, { width: contentW / 2 });

      let y = 120;

      // ---------- SUMMARY CARDS ----------
      const cardW = (contentW - 3 * 12) / 4;
      const cards = [
        { label: "TESTED", value: String(summary.total), color: NAVY },
        { label: "PASSED", value: String(summary.passed), color: GREEN },
        { label: "FAILED", value: String(summary.failed), color: RED },
        { label: "PASS %", value: `${summary.passPct}%`, color: ACCENT },
      ];
      cards.forEach((c, i) => {
        const x = left + i * (cardW + 12);
        doc.roundedRect(x, y, cardW, 60, 8).fill("#f8fafc");
        doc.roundedRect(x, y, cardW, 60, 8).lineWidth(0.8).stroke(LINE);
        doc.fillColor(SUB).font("med").fontSize(9).text(c.label, x + 12, y + 12, { width: cardW - 24 });
        doc.fillColor(c.color).font("b").fontSize(22).text(c.value, x + 12, y + 26, { width: cardW - 24 });
      });
      y += 84;

      // ---------- FAILED FREEZERS HIGHLIGHT ----------
      const failedRows = rows.filter((r) => r.overallResult === "FAIL");
      if (failedRows.length > 0) {
        const perRow = 3;
        const lines = Math.ceil(failedRows.length / perRow);
        const boxH = 30 + lines * 16 + 8;
        doc.roundedRect(left, y, contentW, boxH, 8).fill(REDBG);
        doc.roundedRect(left, y, contentW, boxH, 8).lineWidth(1).stroke(RED);
        doc.fillColor(RED).font("b").fontSize(12).text(`Failed Freezers (${failedRows.length})`, left + 12, y + 10, { width: contentW - 24 });
        const colW = contentW / perRow;
        failedRows.forEach((r, i) => {
          const col = i % perRow;
          const rowN = Math.floor(i / perRow);
          doc.fillColor(INK).font("med").fontSize(9)
            .text(`- ${r.freezerId}`, left + 14 + col * colW, y + 34 + rowN * 16, { width: colW - 18, ellipsis: true, lineBreak: false });
        });
        y += boxH + 16;
      }

      // ---------- DETAILED TABLE ----------
      const cols = [
        { label: "Freezer ID", w: 0.20 },
        { label: "Model", w: 0.10 },
        { label: "Test Time (IST)", w: 0.20 },
        { label: "Dur.", w: 0.07 },
        { label: "Volt", w: 0.08 },
        { label: "Curr", w: 0.08 },
        { label: "Pwr", w: 0.07 },
        { label: "Gas", w: 0.07 },
        { label: "Overall", w: 0.13 },
      ];
      const colX: number[] = [];
      let acc = left;
      cols.forEach((c) => { colX.push(acc); acc += c.w * contentW; });

      const rowH = 20;
      const headerH = 22;
      const cellW = (i: number) => Math.max(10, cols[i].w * contentW - 8);

      function drawTableHeader() {
        doc.rect(left, y, contentW, headerH).fill(NAVY);
        cols.forEach((c, i) => {
          doc.fillColor("#ffffff").font("sb").fontSize(8.5)
            .text(c.label, colX[i] + 4, y + 6, { width: cellW(i), ellipsis: true, lineBreak: false });
        });
        y += headerH;
      }

      doc.font("sb").fontSize(11).fillColor(NAVY).text("Detailed Results", left, y, { width: contentW });
      y += 18;
      drawTableHeader();

      const bottomLimit = doc.page.height - 50;

      rows.forEach((r, idx) => {
        if (y + rowH > bottomLimit) {
          doc.addPage();
          y = MARGIN;
          drawTableHeader();
        }
        if (r.overallResult === "FAIL") doc.rect(left, y, contentW, rowH).fill(REDBG);
        else if (idx % 2 === 0) doc.rect(left, y, contentW, rowH).fill(ZEBRA);

        const cell = (i: number, text: string, color = INK, font = "reg") => {
          doc.fillColor(color).font(font).fontSize(8.5)
            .text(text, colX[i] + 4, y + 6, { width: cellW(i), ellipsis: true, lineBreak: false });
        };
        const rc = (v: string | null) => (v === "PASS" ? GREEN : v === "FAIL" ? RED : SUB);

        cell(0, r.freezerId, INK, "med");
        cell(1, r.model ?? "-");
        cell(2, fmtDateTime(r.completedAt).replace(" IST", ""));
        cell(3, fmtDur(r.durationSeconds));
        cell(4, r.voltageResult ?? "-", rc(r.voltageResult), "sb");
        cell(5, r.currentResult ?? "-", rc(r.currentResult), "sb");
        cell(6, r.powerResult ?? "-", rc(r.powerResult), "sb");
        cell(7, r.gasResult ?? "-", rc(r.gasResult), "sb");
        cell(8, r.overallResult ?? "-", rc(r.overallResult), "b");

        doc.moveTo(left, y + rowH).lineTo(right, y + rowH).lineWidth(0.3).strokeColor(LINE).stroke();
        y += rowH;
      });

      // ---------- FOOTER + PAGE NUMBERS ----------
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const fy = doc.page.height - 34;
        doc.moveTo(left, fy).lineTo(right, fy).lineWidth(0.5).strokeColor(LINE).stroke();
        doc.fillColor(SUB).font("reg").fontSize(8)
          .text("Freezer PDI Daily Report  -  Sentiantal", left, fy + 6, { width: contentW / 2, lineBreak: false });
        doc.fillColor(SUB).font("reg").fontSize(8)
          .text(`Page ${i + 1} of ${range.count}`, left + contentW / 2, fy + 6, { width: contentW / 2, align: "right", lineBreak: false });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
