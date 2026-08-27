// src/app/api/tests/route.ts
// History list. GET /api/tests?stationId=STATION-01&q=FRZ&result=PASS&limit=50
// q = freezer-code contains (case-insensitive); result = PASS | FAIL (omit for all).

import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = (searchParams.get("stationId") ?? "STATION-01").trim();
    const q = (searchParams.get("q") ?? "").trim();
    const result = (searchParams.get("result") ?? "").trim().toUpperCase();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

    const station = await prisma.testStation.findUnique({ where: { stationId } });
    if (!station) return err(`Unknown station: ${stationId}`, 404);

    const where: any = { stationId: station.id };
    if (result === "PASS" || result === "FAIL") where.overallResult = result;
    if (q) where.freezer = { freezerCode: { contains: q, mode: "insensitive" } };

    const sessions = await prisma.testSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { freezer: true },
    });

    return ok({
      tests: sessions.map((s) => ({
        testId: s.id,
        freezerId: s.freezer.freezerCode,
        status: s.status,
        overallResult: s.overallResult,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationSeconds: s.durationSeconds,
      })),
    });
  } catch (e) {
    console.error("[PDI] /tests error:", e);
    return err("Internal error", 500);
  }
}