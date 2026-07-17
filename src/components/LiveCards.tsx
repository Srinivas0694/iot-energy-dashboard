"use client";
import { Card } from "./ui/Card";
import { MetricCard } from "./MetricCard";
import { StatusBadge } from "./StatusBadge";
import type { LatestPayload } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

/**
 * Live monitoring row: four metric readouts + a status/last-updated tile.
 * Values re-render automatically as the parent polls /api/latest.
 */
export function LiveCards({
  data,
  loading,
}: {
  data: LatestPayload | null;
  loading: boolean;
}) {
  const r = data?.reading;
  const online = data?.online ?? false;
  const lastSeen = data?.device?.lastSeenAt;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard metric="current" value={r?.current} loading={loading} decimals={2} />
      <MetricCard metric="voltage" value={r?.voltage} loading={loading} decimals={1} />
      <MetricCard metric="power" value={r?.power} loading={loading} decimals={1} />
      <MetricCard metric="energy" value={r?.energy} loading={loading} decimals={2} />

      <Card className="flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--muted)]">
            Device Status
          </span>
          <StatusBadge online={online} />
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Last updated
          </div>
          <div className="tnum mt-1 text-sm font-semibold text-[var(--text)]">
            {lastSeen
              ? `${formatDistanceToNow(new Date(lastSeen))} ago`
              : "—"}
          </div>
          {r?.timestamp && (
            <div className="tnum mt-0.5 text-xs text-[var(--muted)]">
              {new Date(r.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
