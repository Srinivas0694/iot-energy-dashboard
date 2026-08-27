// src/app/api/freezers/route.ts
// GET  /api/freezers          -> { nextId, count }  (suggest next FRZ-YYYY-NNNNNN)
// POST /api/freezers { freezerCode, model? } -> creates (idempotent) and returns it
//
// ID format: FRZ-<year>-<6-digit sequence>. The sequence is derived from the
// highest existing number for the current year, so it keeps counting up.

import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

async function suggestNextId() {
  const year = new Date().getFullYear();
  const prefix = `FRZ-${year}-`;
  const latest = await prisma.freezer.findFirst({
    where: { freezerCode: { startsWith: prefix } },
    orderBy: { freezerCode: "desc" },
  });
  let next = 1;
  if (latest) {
    const tail = latest.freezerCode.slice(prefix.length);
    const num = parseInt(tail, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${pad6(next)}`;
}

export async function GET() {
  try {
    const nextId = await suggestNextId();
    const count = await prisma.freezer.count();
    return ok({ nextId, count });
  } catch (e) {
    console.error("[PDI] /freezers GET error:", e);
    return err("Internal error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const freezerCode = String(body.freezerCode ?? "").trim().toUpperCase();
    const model = body.model ? String(body.model).trim() : null;

    if (!/^FRZ-\d{4}-\d{6}$/.test(freezerCode)) {
      return err("freezerCode must look like FRZ-2026-000001");
    }

    const freezer = await prisma.freezer.upsert({
      where: { freezerCode },
      update: model ? { model } : {},
      create: { freezerCode, model },
    });

    return ok({
      success: true,
      freezerId: freezer.freezerCode,
      model: freezer.model,
      createdAt: freezer.createdAt,
    });
  } catch (e) {
    console.error("[PDI] /freezers POST error:", e);
    return err("Internal error", 500);
  }
}