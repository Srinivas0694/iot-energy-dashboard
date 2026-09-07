// src/app/api/reports/debug/route.ts  (TEMPORARY — verification)
// GET /api/reports/debug?date=2026-09-01&type=pdf|xlsx|csv|json
import { getDailyReport, istToday } from "@/lib/reports/data";
import { buildDailyPdf } from "@/lib/reports/pdf";
import { buildDailyXlsx } from "@/lib/reports/xlsx";
import { buildDailyCsv } from "@/lib/reports/csv";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || istToday();
  const type = (searchParams.get("type") || "json").toLowerCase();
  const { rows, summary } = await getDailyReport(date);
  const fname = `Freezer_PDI_Report_${date}`;

  if (type === "json") {
    return NextResponse.json({ date, summary, count: rows.length, rows });
  }
  if (type === "pdf") {
    const pdf = await buildDailyPdf(date, rows, summary);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fname}.pdf"` },
    });
  }
  if (type === "xlsx") {
    const xlsx = buildDailyXlsx(date, rows, summary);
    return new Response(new Uint8Array(xlsx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fname}.xlsx"`,
      },
    });
  }
  if (type === "csv") {
    const csv = buildDailyCsv(date, rows, summary);
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fname}.csv"` },
    });
  }
  return NextResponse.json({ error: "bad type" }, { status: 400 });
}
