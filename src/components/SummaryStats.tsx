"use client";
import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { fmt } from "@/lib/utils";
import type { SummaryStats as Stats } from "@/lib/types";

const ITEMS: { key: keyof Stats; label: string; unit: string; decimals: number }[] = [
  { key: "avgVoltage", label: "Avg Voltage", unit: "V", decimals: 1 },
  { key: "avgCurrent", label: "Avg Current", unit: "A", decimals: 2 },
  { key: "totalEnergy", label: "Total Energy", unit: "kWh", decimals: 2 },
  { key: "peakPower", label: "Peak Power", unit: "W", decimals: 1 },
  { key: "minVoltage", label: "Min Voltage", unit: "V", decimals: 1 },
  { key: "maxVoltage", label: "Max Voltage", unit: "V", decimals: 1 },
];

/** Aggregate statistics strip for the selected range. */
export function SummaryStats({
  stats,
  loading,
}: {
  stats: Stats | null;
  loading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Summary — selected range
        </h3>
        {stats && (
          <span className="text-xs text-[var(--muted)]">
            {stats.sampleCount.toLocaleString()} samples
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {ITEMS.map((it) => (
          <div key={it.key as string} className="rounded-xl bg-[var(--bg)] p-3">
            <div className="text-xs font-medium text-[var(--muted)]">{it.label}</div>
            {loading || !stats ? (
              <Skeleton className="mt-2 h-6 w-16" />
            ) : (
              <div className="tnum mt-1 text-lg font-bold text-[var(--text)]">
                {fmt(stats[it.key] as number, it.decimals)}
                <span className="ml-1 text-xs font-medium text-[var(--muted)]">
                  {it.unit}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
