// src/app/api/tests/[id]/route.ts
// One test with all its readings (for the report graphs).
// GET /api/tests/<testId>

import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    const session = await prisma.testSession.findUnique({
      where: { id },
      include: { freezer: true, station: true },
    });
    if (!session) return err("Unknown test", 404);

    const readings = await prisma.sensorReading.findMany({
      where: { testSessionId: id },
      orderBy: { elapsedSeconds: "asc" },
    });

    return ok({
      test: {
        testId: session.id,
        freezerId: session.freezer.freezerCode,
        stationId: session.station.stationId,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        durationSeconds: session.durationSeconds,
        voltageResult: session.voltageResult,
        currentResult: session.currentResult,
        powerResult: session.powerResult,
        gasResult: session.gasResult,
        overallResult: session.overallResult,
      },
      readings: readings.map((r) => ({
        elapsedSeconds: r.elapsedSeconds,
        voltage: r.voltage,
        current: r.current,
        power: r.power,
        energy: r.energy,
        gasValue: r.gasValue,
        gasStatus: r.gasStatus,
        voltageStatus: r.voltageStatus,
        currentStatus: r.currentStatus,
        powerStatus: r.powerStatus,
      })),
    });
  } catch (e) {
    console.error("[PDI] /tests/[id] error:", e);
    return err("Internal error", 500);
  }
}