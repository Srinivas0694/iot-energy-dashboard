import type { Reading, SummaryStats } from "./types";

/** Tailwind className joiner. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Format a number with fixed decimals and thousands separators. */
export function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** A device is considered online if it reported within this many ms. */
export const OFFLINE_THRESHOLD_MS = 15_000;

export function isOnline(lastSeenAt: string | Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt).getTime();
  return Date.now() - last < OFFLINE_THRESHOLD_MS;
}

/**
 * Compute summary statistics from a set of readings.
 * Total energy uses (max - min) of the cumulative meter, which is robust to
 * counter resets across the window better than summing deltas would be here.
 */
export function computeSummary(readings: Reading[]): SummaryStats {
  if (readings.length === 0) {
    return {
      avgVoltage: 0,
      avgCurrent: 0,
      totalEnergy: 0,
      peakPower: 0,
      minVoltage: 0,
      maxVoltage: 0,
      sampleCount: 0,
    };
  }

  let vSum = 0;
  let cSum = 0;
  let peakPower = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  let minEnergy = Infinity;
  let maxEnergy = -Infinity;

  for (const r of readings) {
    vSum += r.voltage;
    cSum += r.current;
    if (r.power > peakPower) peakPower = r.power;
    if (r.voltage < minV) minV = r.voltage;
    if (r.voltage > maxV) maxV = r.voltage;
    if (r.energy < minEnergy) minEnergy = r.energy;
    if (r.energy > maxEnergy) maxEnergy = r.energy;
  }

  const n = readings.length;
  return {
    avgVoltage: vSum / n,
    avgCurrent: cSum / n,
    totalEnergy: Math.max(0, maxEnergy - minEnergy),
    peakPower: peakPower === -Infinity ? 0 : peakPower,
    minVoltage: minV === Infinity ? 0 : minV,
    maxVoltage: maxV === -Infinity ? 0 : maxV,
    sampleCount: n,
  };
}

/** Convert BigInt-bearing Prisma rows into plain JSON-safe Reading objects. */
export function serializeReading(row: {
  id: bigint | number | string;
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  timestamp: Date;
}): Reading {
  return {
    id: String(row.id),
    deviceId: row.deviceId,
    voltage: row.voltage,
    current: row.current,
    power: row.power,
    energy: row.energy,
    timestamp: row.timestamp.toISOString(),
  };
}
