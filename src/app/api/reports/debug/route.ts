// src/app/api/reports/debug/route.ts  (TEMPORARY — for verification only)
import { NextResponse } from "next/server";
import { getDailyReport, istToday } from "@/lib/reports/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || istToday(); // yyyy-mm-dd (IST)
  const data = await getDailyReport(date);
  return NextResponse.json({
    istDate: data.istDate,
    utcWindow: { start: data.startUtc, end: data.endUtc },
    summary: data.summary,
    rows: data.rows,
  });
}