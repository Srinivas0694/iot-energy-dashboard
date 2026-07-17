import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReading, computeSummary } from "@/lib/utils";
import { resolveRange } from "@/lib/date-ranges";
import type { RangePreset } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/summary?deviceId=&range=&from=&to=  → aggregate statistics. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const deviceId = sp.get("deviceId") || undefined;
  const range = (sp.get("range") as RangePreset) || "last7";
  const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));

  const rows = await prisma.reading.findMany({
    where: { ...(deviceId ? { deviceId } : {}), timestamp: { gte: from, lte: to } },
    orderBy: { timestamp: "asc" },
  });

  const summary = computeSummary(rows.map(serializeReading));
  return NextResponse.json({ from: from.toISOString(), to: to.toISOString(), summary });
}
