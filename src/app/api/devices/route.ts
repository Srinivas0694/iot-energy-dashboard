import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOnline } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/devices  → all registered devices with derived online status. */
export async function GET() {
  const devices = await prisma.device.findMany({ orderBy: { name: "asc" } });
  type DeviceRow = {
    deviceId: string;
    name: string;
    location: string;
    lastSeenAt: Date | null;
  };
  return NextResponse.json({
    devices: devices.map((d: DeviceRow) => ({
      deviceId: d.deviceId,
      name: d.name,
      location: d.location,
      status: isOnline(d.lastSeenAt) ? "ONLINE" : "OFFLINE",
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    })),
  });
}

/**
 * POST /api/devices  → create or update device metadata.
 * Body: { deviceId, name?, location? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }
  const device = await prisma.device.upsert({
    where: { deviceId: body.deviceId },
    create: {
      deviceId: body.deviceId,
      name: body.name ?? body.deviceId,
      location: body.location ?? "",
    },
    update: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
    },
  });
  return NextResponse.json({ ok: true, device });
}
