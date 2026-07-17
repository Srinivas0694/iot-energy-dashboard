import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReading, computeSummary } from "@/lib/utils";
import { resolveRange, RANGE_LABELS } from "@/lib/date-ranges";
import { buildCsv } from "@/lib/download/csv";
import { buildExcel } from "@/lib/download/excel";
import { buildPdf } from "@/lib/download/pdf";
import type { RangePreset } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/download?format=csv|xlsx|pdf&deviceId=&range=&from=&to=&search=
 * Exports ONLY the currently filtered data set (same filters as the table).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") || "csv").toLowerCase();
  const deviceId = sp.get("deviceId") || undefined;
  const range = (sp.get("range") as RangePreset) || "last7";
  const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));
  const search = sp.get("search")?.trim();

  const searchFilter =
    search && !Number.isNaN(Number(search))
      ? (() => {
          const n = Number(search);
          const tol = Math.max(0.5, Math.abs(n) * 0.02);
          return {
            OR: [
              { voltage: { gte: n - tol, lte: n + tol } },
              { current: { gte: n - tol, lte: n + tol } },
              { power: { gte: n - tol, lte: n + tol } },
              { energy: { gte: n - tol, lte: n + tol } },
            ],
          };
        })()
      : {};

  const rows = await prisma.reading.findMany({
    where: {
      ...(deviceId ? { deviceId } : {}),
      timestamp: { gte: from, lte: to },
      ...searchFilter,
    },
    orderBy: { timestamp: "asc" },
  });

  const readings = rows.map(serializeReading);
  const summary = computeSummary(readings);
  const rangeLabel = RANGE_LABELS[range] ?? range;
  const deviceLabel = deviceId ?? "All devices";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const baseName = `energy-report_${deviceId ?? "all"}_${stamp}`;

  if (format === "csv") {
    return new NextResponse(buildCsv(readings), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const buf = await buildExcel(readings, { deviceLabel, rangeLabel, from, to, summary });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const buf = buildPdf(readings, { deviceLabel, rangeLabel, from, to, summary });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
