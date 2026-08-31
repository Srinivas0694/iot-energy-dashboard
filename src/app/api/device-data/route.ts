import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReading } from "@/lib/utils";
import { resolveRange } from "@/lib/date-ranges";
import type { RangePreset } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/device-data
 * Ingest a single reading from the IoT device.
 * The firmware should send header  x-api-key: <DEVICE_API_KEY>  (if configured).
 *
 * Body: { deviceId, voltage, current, power, energy, timestamp? }
 */
export async function POST(req: NextRequest) {
  // --- Optional shared-secret auth ---
  const requiredKey = process.env.DEVICE_API_KEY;
  if (requiredKey) {
    const provided = req.headers.get("x-api-key");
    if (provided !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

    const { deviceId, voltage, current, power, energy, timestamp, gasADC, gasStatus } = body ?? {};

  // --- Validation ---
  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }
  const nums = { voltage, current, power, energy };
  for (const [k, v] of Object.entries(nums)) {
    if (typeof v !== "number" || Number.isNaN(v)) {
      return NextResponse.json({ error: `${k} must be a number` }, { status: 400 });
    }
  }

  const ts = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }

  // --- Upsert device (auto-register unknown devices) + create reading ---
  await prisma.device.upsert({
    where: { deviceId },
    create: { deviceId, name: deviceId, status: "ONLINE", lastSeenAt: new Date() },
    update: { status: "ONLINE", lastSeenAt: new Date() },
  });

    const reading = await prisma.reading.create({
    data: {
      deviceId, voltage, current, power, energy, timestamp: ts,
      gas: typeof gasADC === "number" ? gasADC : null,
      gasStatus: typeof gasStatus === "string" ? gasStatus : null,
    },
  });

  return NextResponse.json(
    { ok: true, reading: serializeReading(reading) },
    { status: 201 },
  );
}

/**
 * GET /api/device-data
 * Paginated + searchable + sortable table feed.
 * Query: deviceId, range, from, to, page, pageSize, sort, order, search
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const deviceId = sp.get("deviceId") || undefined;
  const range = (sp.get("range") as RangePreset) || "last7";
  const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));

  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(200, Math.max(5, Number(sp.get("pageSize") || 25)));
  const sort = sp.get("sort") || "timestamp";
  const order = (sp.get("order") === "asc" ? "asc" : "desc") as "asc" | "desc";
  const search = sp.get("search")?.trim();

  const allowedSort = ["timestamp", "voltage", "current", "power", "energy"];
  const orderBy = { [allowedSort.includes(sort) ? sort : "timestamp"]: order };

  // Numeric "search" matches any metric approximately (± tolerance) or a value.
  const searchFilter =
    search && !Number.isNaN(Number(search))
      ? (() => {
          const n = Number(search);
          const tol = Math.max(0.5, Math.abs(n) * 0.02);
          return {
            OR: [
              { voltage: { gte: n - tol, lte: n + tol } },
              { current: { gte: n - tol, lte: n + tol } },
              { power: { gte: n - tol, lte: n + tol } },
              { energy: { gte: n - tol, lte: n + tol } },
            ],
          };
        })()
      : {};

  const where = {
    ...(deviceId ? { deviceId } : {}),
    timestamp: { gte: from, lte: to },
    ...searchFilter,
  };

  const [rows, total] = await Promise.all([
    prisma.reading.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reading.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map(serializeReading),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
