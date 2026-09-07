// src/app/api/reports/debug-pdf/route.ts  (TEMPORARY — inspection only)
// Opens/downloads the generated PDF for a date so you can verify formatting.
// GET /api/reports/debug-pdf?date=2026-09-01

import { getDailyReport, istToday } from "@/lib/reports/data";
import { buildDailyPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || istToday();
  const { rows, summary } = await getDailyReport(date);

  const pdf = await buildDailyPdf(date, rows, summary);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Freezer_PDI_Report_${date}.pdf"`,
    },
  });
}
