import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReading } from "@/lib/utils";
import { resolveRange } from "@/lib/date-ranges";
import type { RangePreset } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_POINTS = 500; // keep chart payloads light

/**
 * GET /api/historical?deviceId=&range=&from=&to=
 * Returns time-ordered readings for charting, downsampled to MAX_POINTS.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const deviceId = sp.get("deviceId") || undefined;
  const range = (sp.get("range") as RangePreset) || "last7";
  const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));

  const where = {
    ...(deviceId ? { deviceId } : {}),
    timestamp: { gte: from, lte: to },
  };

  const rows = await prisma.reading.findMany({
    where,
    orderBy: { timestamp: "asc" },
  });

  const readings = rows.map(serializeReading);

  // Uniform downsampling (nth-point) so charts stay responsive on wide ranges.
  let series = readings;
  if (readings.length > MAX_POINTS) {
    const step = Math.ceil(readings.length / MAX_POINTS);
    series = readings.filter((_: import("@/lib/types").Reading, i: number) => i % step === 0);
  }

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    count: readings.length,
    series,
  });
}
