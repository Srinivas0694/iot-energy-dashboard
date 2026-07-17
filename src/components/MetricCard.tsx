"use client";
import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { cn, fmt } from "@/lib/utils";
import type { MetricKey } from "@/lib/types";

const META: Record<
  MetricKey,
  { label: string; unit: string; color: string; icon: React.ReactNode }
> = {
  current: {
    label: "Current",
    unit: "A",
    color: "text-metric-current",
    icon: (
      <path d="M13 2L4.5 12.5H11l-1 9.5L19.5 11H13l0-9z" />
    ),
  },
  voltage: {
    label: "Voltage",
    unit: "V",
    color: "text-metric-voltage",
    icon: <path d="M4 12h4l2-6 4 12 2-6h4" />,
  },
  power: {
    label: "Power",
    unit: "W",
    color: "text-metric-power",
    icon: <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2zM9 21h6M10 17v4M14 17v4" />,
  },
  energy: {
    label: "Energy",
    unit: "kWh",
    color: "text-metric-energy",
    icon: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  },
};

/** A single live metric readout with icon, big tabular value, and unit. */
export function MetricCard({
  metric,
  value,
  loading,
  decimals = 2,
}: {
  metric: MetricKey;
  value: number | null | undefined;
  loading?: boolean;
  decimals?: number;
}) {
  const m = META[metric];
  return (
    <Card className="group p-5 hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted)]">{m.label}</span>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg)]",
            m.color,
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {m.icon}
          </svg>
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <span className="tnum text-3xl font-bold leading-none text-[var(--text)]">
            {fmt(value, decimals)}
          </span>
        )}
        <span className="text-sm font-medium text-[var(--muted)]">{m.unit}</span>
      </div>
    </Card>
  );
}
