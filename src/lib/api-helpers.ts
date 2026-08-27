// lib/api-helpers.ts
import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

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

export const GAS_STATUS = ["SAFE", "WARNING", "LEAK"] as const;
export const PARAM_STATUS = ["PENDING", "PASS", "WARN", "FAIL"] as const;
export const RESULT = ["PASS", "FAIL"] as const;

export function upper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}