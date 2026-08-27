// app/api/test/active/route.ts
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
      remainingSeconds: remaining,
    });
  } catch (e) {
    console.error("[PDI] /test/active error:", e);
    return err("Internal error", 500);
  }
}