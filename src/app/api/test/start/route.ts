// app/api/test/start/route.ts
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const stationId = String(body.stationId ?? "").trim();
    const freezerCode = String(body.freezerId ?? "").trim();
    if (!stationId || !freezerCode) return err("stationId and freezerId are required");

    const station = await prisma.testStation.findUnique({ where: { stationId } });
    if (!station) return err(`Unknown station: ${stationId}`, 404);

    const freezer = await prisma.freezer.upsert({
      where: { freezerCode },
      update: {},
      create: { freezerCode },
    });

    const existing = await prisma.testSession.findFirst({
      where: { stationId: station.id, status: "RUNNING" },
    });
    if (existing) {
      return err("Station already has a running test", 409, { testId: existing.id });
    }

    let session;
    try {
      session = await prisma.testSession.create({
        data: {
          freezerId: freezer.id,
          stationId: station.id,
          status: "RUNNING",
          durationSeconds: 300,
        },
      });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "";
      const code = (e as { code?: string })?.code ?? "";
      if (code === "P2002" || msg.includes("one_running_test_per_station")) {
        return err("Station already has a running test", 409);
      }
      throw e;
    }

    return ok({
      success: true,
      testId: session.id,
      freezerId: freezer.freezerCode,
      stationId: station.stationId,
      duration: session.durationSeconds,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
    });
  } catch (e) {
    console.error("[PDI] /test/start error:", e);
    return err("Internal error", 500);
  }
}