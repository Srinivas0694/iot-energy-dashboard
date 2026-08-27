// app/api/test/active/route.ts
// Polled by the ESP32 while IDLE (every 2-5s) and once after a reboot.
// GET /api/test/active?stationId=STATION-01   (requires x-api-key)
//
// Doubles as the station heartbeat: every poll updates last_seen + ONLINE.
// Returns started_at + elapsed/remaining so the ESP32 can resume the exact
// remaining time after a reset — the 5-min clock lives on the SERVER.

import { prisma } from "@/lib/prisma";
import { ok, err, checkDeviceKey } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = checkDeviceKey(req);
  if (auth) return err(auth, 401);

  try {
    const { searchParams } = new URL(req.url);
    const stationId = (searchParams.get("stationId") ?? "").trim();
    if (!stationId) return err("stationId query param is required");

    const station = await prisma.testStation.findUnique({ where: { stationId } });
    if (!station) return err(`Unknown station: ${stationId}`, 404);

    // Heartbeat
    await prisma.testStation.update({
      where: { id: station.id },
      data: { lastSeen: new Date(), status: "ONLINE" },
    });

    const session = await prisma.testSession.findFirst({
      where: { stationId: station.id, status: "RUNNING" },
      orderBy: { startedAt: "desc" },
      include: { freezer: true },
    });

    if (!session) return ok({ active: false });

    const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    const remaining = Math.max(0, session.durationSeconds - elapsed);

    return ok({
      active: true,
      testId: session.id,
      freezerId: session.freezer.freezerCode,
      duration: session.durationSeconds,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      elapsedSeconds: elapsed,
      remainingSeconds: remaining, // 0 means the test is overdue -> ESP32 should FINISH
    });
  } catch (e) {
    console.error("[PDI] /test/active error:", e);
    return err("Internal error", 500);
  }
}
