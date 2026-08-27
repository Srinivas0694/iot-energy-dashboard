// app/api/test/reading/route.ts
import { prisma } from "@/lib/prisma";
import { ok, err, checkDeviceKey, GAS_STATUS, PARAM_STATUS, upper } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = checkDeviceKey(req);
  if (auth) return err(auth, 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const items: any[] = Array.isArray(body) ? body : [body];
    if (items.length === 0) return err("No readings provided");

    const testId = String(items[0].testId ?? "").trim();
    const stationId = String(items[0].stationId ?? "").trim();
    if (!testId) return err("testId is required");

    const session = await prisma.testSession.findUnique({
      where: { id: testId },
      include: { station: true },
    });
    if (!session) return err("Unknown testId", 404);
    if (stationId && session.station.stationId !== stationId)
      return err("testId does not belong to this station", 403);
    if (session.status !== "RUNNING")
      return err("Test is not running", 409, { status: session.status });

    const rows = [];
    for (const r of items) {
      const gasStatus = upper(r.gasStatus);
      const vS = upper(r.voltageStatus);
      const cS = upper(r.currentStatus);
      const pS = upper(r.powerStatus);

      if (!GAS_STATUS.includes(gasStatus as any))
        return err(`Bad gasStatus: ${r.gasStatus}`);
      if (
        !PARAM_STATUS.includes(vS as any) ||
        !PARAM_STATUS.includes(cS as any) ||
        !PARAM_STATUS.includes(pS as any)
      )
        return err("Bad voltage/current/power status value");

      rows.push({
        testSessionId: session.id,
        elapsedSeconds: Math.max(0, Math.round(Number(r.elapsedSeconds) || 0)),
        voltage: Number(r.voltage) || 0,
        current: Number(r.current) || 0,
        power: Number(r.power) || 0,
        energy: Number(r.energy) || 0,
        gasValue: Math.round(Number(r.gasValue) || 0),
        gasStatus: gasStatus as any,
        voltageStatus: vS as any,
        currentStatus: cS as any,
        powerStatus: pS as any,
      });
    }

    await prisma.testStation.update({
      where: { id: session.stationId },
      data: { lastSeen: new Date(), status: "ONLINE" },
    });
    await prisma.sensorReading.createMany({ data: rows });

    return ok({ success: true, inserted: rows.length });
  } catch (e) {
    console.error("[PDI] /test/reading error:", e);
    return err("Internal error", 500);
  }
}