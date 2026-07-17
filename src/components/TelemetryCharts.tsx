"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import type { MetricKey, Reading } from "@/lib/types";
import { format } from "date-fns";

const SERIES: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: "current", label: "Current vs Time", unit: "A", color: "#2563eb" },
  { key: "voltage", label: "Voltage vs Time", unit: "V", color: "#7c3aed" },
  { key: "power", label: "Power vs Time", unit: "W", color: "#f59e0b" },
  { key: "energy", label: "Energy vs Time", unit: "kWh", color: "#059669" },
];

function ChartTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-card-hover">
      <div className="font-semibold text-[var(--text)]">
        {p.value?.toFixed(2)} {unit}
      </div>
      <div className="text-[var(--muted)]">
        {format(new Date(p.payload.timestamp), "dd MMM HH:mm:ss")}
      </div>
    </div>
  );
}

function SingleChart({
  data,
  meta,
}: {
  data: Reading[];
  meta: (typeof SERIES)[number];
}) {
  const gradientId = `grad-${meta.key}`;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">{meta.label}</h3>
        <span className="text-xs font-medium text-[var(--muted)]">{meta.unit}</span>
      </div>
      <div className="h-56">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
            No data in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(t) => format(new Date(t), "HH:mm")}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                stroke="var(--border)"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                stroke="var(--border)"
                width={44}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<ChartTooltip unit={meta.unit} />} />
              <Area
                type="monotone"
                dataKey={meta.key}
                stroke={meta.color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive
                animationDuration={500}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/** 2×2 grid of interactive time-series charts. */
export function TelemetryCharts({
  series,
  loading,
}: {
  series: Reading[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SERIES.map((s) => (
          <Card key={s.key} className="p-5">
            <Skeleton className="mb-3 h-4 w-32" />
            <Skeleton className="h-56 w-full" />
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {SERIES.map((s) => (
        <SingleChart key={s.key} data={series} meta={s} />
      ))}
    </div>
  );
}
