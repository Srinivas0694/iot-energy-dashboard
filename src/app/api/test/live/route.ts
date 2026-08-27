// src/app/api/test/live/route.ts
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-helpers";
import { expireStaleTests } from "@/lib/expire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = (searchParams.get("stationId") ?? "STATION-01").trim();

    const station = await prisma.testStation.findUnique({ where: { stationId } });
    if (!station) return err(`Unknown station: ${stationId}`, 404);
    await expireStaleTests(station.id);

    const session = await prisma.testSession.findFirst({
      where: { stationId: station.id, status: "RUNNING" },
      orderBy: { startedAt: "desc" },
      include: { freezer: true },
    });

    if (!session) {
      const last = await prisma.testSession.findFirst({
        where: { stationId: station.id, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        include: { freezer: true },
      });
      return ok({
        active: false,
        stationId: station.stationId,
        stationStatus: station.status,
        lastCompleted: last
          ? {
              testId: last.id,
              freezerId: last.freezer.freezerCode,
              overallResult: last.overallResult,
              voltageResult: last.voltageResult,
              currentResult: last.currentResult,
              powerResult: last.powerResult,
              gasResult: last.gasResult,
              completedAt: last.completedAt,
            }
          : null,
      });
    }

    const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    const remaining = Math.max(0, session.durationSeconds - elapsed);

    const latest = await prisma.sensorReading.findFirst({
      where: { testSessionId: session.id },
      orderBy: { elapsedSeconds: "desc" },
    });

    return ok({
      active: true,
      stationId: station.stationId,
      testId: session.id,
      freezerId: session.freezer.freezerCode,
      duration: session.durationSeconds,
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      latest: latest
        ? {
            elapsedSeconds: latest.elapsedSeconds,
            voltage: latest.voltage,
            current: latest.current,
            power: latest.power,
            energy: latest.energy,
            gasValue: latest.gasValue,
            gasStatus: latest.gasStatus,
            voltageStatus: latest.voltageStatus,
            currentStatus: latest.currentStatus,
            powerStatus: latest.powerStatus,
          }
        : null,
    });
  } catch (e) {
    console.error("[PDI] /test/live error:", e);
    return err("Internal error", 500);
  }
}