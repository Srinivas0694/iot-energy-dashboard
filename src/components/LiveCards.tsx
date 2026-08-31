"use client";
import { Card } from "./ui/Card";
import { MetricCard } from "./MetricCard";
import { StatusBadge } from "./StatusBadge";
import type { LatestPayload } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

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

  const gas = r?.gas;
  const gasStatus = (r?.gasStatus ?? "").toUpperCase();
  const gasColor =
    gasStatus === "LEAKING" || gasStatus === "LEAK"
      ? "text-rose-500"
      : gasStatus === "WARNING"
      ? "text-amber-500"
      : "text-emerald-500";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard metric="current" value={r?.current} loading={loading} decimals={2} />
      <MetricCard metric="voltage" value={r?.voltage} loading={loading} decimals={1} />
      <MetricCard metric="power" value={r?.power} loading={loading} decimals={1} />
      <MetricCard metric="energy" value={r?.energy} loading={loading} decimals={2} />

      {/* Gas card */}
      <Card className="flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--muted)]">Gas</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
            <path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-5" />
          </svg>
        </div>
        <div className="mt-4">
          <div className="tnum text-2xl font-bold text-[var(--text)]">
            {gas == null ? "—" : gas}
          </div>
          <div className={`mt-1 text-xs font-semibold ${gasColor}`}>
            {gasStatus ? gasStatus.replace("_", " ") : "—"}
          </div>
        </div>
      </Card>

      {/* Device status tile */}
      <Card className="flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--muted)]">Device Status</span>
          <StatusBadge online={online} />
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Last updated
          </div>
          <div className="tnum mt-1 text-sm font-semibold text-[var(--text)]">
            {lastSeen ? `${formatDistanceToNow(new Date(lastSeen))} ago` : "—"}
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