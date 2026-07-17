import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReading, isOnline } from "@/lib/utils";
import type { LatestPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/latest?deviceId=DEVICE001
 * Returns the most recent reading and derived online/offline status.
 * If no deviceId is passed, uses the most recently active device.
 */
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId") || undefined;

  const device = deviceId
    ? await prisma.device.findUnique({ where: { deviceId } })
    : await prisma.device.findFirst({ orderBy: { lastSeenAt: "desc" } });

  if (!device) {
    return NextResponse.json<LatestPayload>({ device: null, reading: null, online: false });
  }

  const reading = await prisma.reading.findFirst({
    where: { deviceId: device.deviceId },
    orderBy: { timestamp: "desc" },
  });

  const online = isOnline(device.lastSeenAt);

  return NextResponse.json<LatestPayload>({
    device: {
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      status: online ? "ONLINE" : "OFFLINE",
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    },
    reading: reading ? serializeReading(reading) : null,
    online,
  });
}
