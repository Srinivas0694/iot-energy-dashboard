// lib/api-helpers.ts
// Shared helpers for the PDI test API routes.

import { NextResponse } from "next/server";

// ---- JSON response helpers ---------------------------------------
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

// ---- Device authentication ---------------------------------------
// Returns null if the request is authorised, or an error message string.
// Fail-closed only when DEVICE_API_KEY is configured. If it's unset we warn
// but allow, so you can test locally before setting the secret.
export function checkDeviceKey(req: Request): string | null {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected) {
    console.warn("[PDI] DEVICE_API_KEY is not set — device routes are UNPROTECTED");
    return null;
  }
  const got = req.headers.get("x-api-key");
  if (!got || got !== expected) return "Invalid or missing x-api-key";
  return null;
}

// ---- Enum value sets (must match prisma/schema.prisma) ------------
export const GAS_STATUS = ["SAFE", "WARNING", "LEAK"] as const;
export const PARAM_STATUS = ["PENDING", "PASS", "WARN", "FAIL"] as const;
export const RESULT = ["PASS", "FAIL"] as const;

export function upper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}
