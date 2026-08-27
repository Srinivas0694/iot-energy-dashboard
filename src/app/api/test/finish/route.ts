// app/api/test/finish/route.ts
import { prisma } from "@/lib/prisma";
import { ok, err, checkDeviceKey, RESULT, upper } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = checkDeviceKey(req);
  if (auth) return err(auth, 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const testId = String(body.testId ?? "").trim();
    const stationId = String(body.stationId ?? "").trim();
    if (!testId) return err("testId is required");

    const session = await prisma.testSession.findUnique({
      where: { id: testId },
      include: { station: true },
    });
    if (!session) return err("Unknown testId", 404);
    if (stationId && session.station.stationId !== stationId)
      return err("testId does not belong to this station", 403);

    if (session.status === "COMPLETED") {
      return ok({
        success: true,
        alreadyCompleted: true,
        testId: session.id,
        overallResult: session.overallResult,
      });
    }

    const v = upper(body.voltageResult);
    const c = upper(body.currentResult);
    const p = upper(body.powerResult);
    const g = upper(body.gasResult);

    for (const [k, val] of Object.entries({
      voltageResult: v,
      currentResult: c,
      powerResult: p,
      gasResult: g,
    })) {
      if (!RESULT.includes(val as any)) return err(`Bad ${k}: must be PASS or FAIL`);
    }

    const overall =
      v === "PASS" && c === "PASS" && p === "PASS" && g === "PASS" ? "PASS" : "FAIL";

    const updated = await prisma.testSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        durationSeconds: Math.round(Number(body.durationSeconds) || session.durationSeconds),
        voltageResult: v as any,
        currentResult: c as any,
        powerResult: p as any,
        gasResult: g as any,
        overallResult: overall as any,
      },
    });

    return ok({ success: true, testId: updated.id, overallResult: overall });
  } catch (e) {
    console.error("[PDI] /test/finish error:", e);
    return err("Internal error", 500);
  }
}