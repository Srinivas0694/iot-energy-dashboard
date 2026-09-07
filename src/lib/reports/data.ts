// src/lib/reports/data.ts
// READ-ONLY. Fetches COMPLETED test_sessions whose completed_at falls within a
// given IST calendar day. Never writes PDI data.
import { prisma } from "@/lib/prisma";

const IST_OFFSET_MIN = 330; // Asia/Kolkata = UTC+5:30

// Returns the [startUtc, endUtc) window for the given IST day (yyyy-mm-dd).
export function istDayRange(istDate: string): { startUtc: Date; endUtc: Date } {
  // IST midnight = that date 00:00 IST = (00:00 - 5:30) UTC
  const [y, m, d] = istDate.split("-").map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60_000;
  const startUtc = new Date(startUtcMs);
  const endUtc = new Date(startUtcMs + 24 * 60 * 60_000);
  return { startUtc, endUtc };
}

// The IST calendar date (yyyy-mm-dd) for "now" (or a given instant).
export function istToday(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  return ist.toISOString().slice(0, 10); // yyyy-mm-dd in IST
}

export type ReportRow = {
  freezerId: string;
  model: string | null;
  station: string;
  startedAt: Date;
  completedAt: Date | null;
  durationSeconds: number;
  voltageResult: string | null;
  currentResult: string | null;
  powerResult: string | null;
  gasResult: string | null;
  overallResult: string | null;
};

export async function getDailyReport(istDate: string) {
  const { startUtc, endUtc } = istDayRange(istDate);

  const sessions = await prisma.testSession.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: startUtc, lt: endUtc },
    },
    orderBy: { completedAt: "asc" },
    include: { freezer: true, station: true },
  });

  const rows: ReportRow[] = sessions.map((s) => ({
    freezerId: s.freezer.freezerCode,
    model: s.freezer.model,
    station: s.station.stationId,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    durationSeconds: s.durationSeconds,
    voltageResult: s.voltageResult,
    currentResult: s.currentResult,
    powerResult: s.powerResult,
    gasResult: s.gasResult,
    overallResult: s.overallResult,
  }));

  const total = rows.length;
  const passed = rows.filter((r) => r.overallResult === "PASS").length;
  const failed = rows.filter((r) => r.overallResult === "FAIL").length;
  const passPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return { istDate, startUtc, endUtc, rows, summary: { total, passed, failed, passPct } };
}