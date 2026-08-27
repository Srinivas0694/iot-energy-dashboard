"use client";

// src/app/live/page.tsx
// Live view of the running test: countdown, progress bar, and per-parameter
// PASS/WARN/FAIL cards. Polls /api/test/live every 2s. No camera, no device key.

import { useEffect, useState } from "react";

const STATION_ID = process.env.NEXT_PUBLIC_STATION_ID ?? "STATION-01";

type Latest = {
  elapsedSeconds: number;
  voltage: number; current: number; power: number; energy: number;
  gasValue: number;
  gasStatus: "SAFE" | "WARNING" | "LEAK";
  voltageStatus: string; currentStatus: string; powerStatus: string;
};
type Live = {
  active: boolean;
  stationId: string;
  testId?: string;
  freezerId?: string;
  duration?: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  latest?: Latest | null;
  lastCompleted?: {
    freezerId: string; overallResult: string;
    voltageResult: string; currentResult: string;
    powerResult: string; gasResult: string;
    completedAt: string;
  } | null;
};

function statusColor(s?: string) {
  switch ((s ?? "").toUpperCase()) {
    case "PASS": case "SAFE": return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    case "WARN": case "WARNING": return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    case "FAIL": case "LEAK": return "text-red-400 border-red-500/40 bg-red-500/10";
    default: return "text-slate-400 border-slate-700 bg-slate-800/40";
  }
}
function mmss(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function LivePage() {
  const [data, setData] = useState<Live | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/test/live?stationId=${STATION_ID}`, { cache: "no-store" });
        const json = await res.json();
        if (alive) { setData(json); setErr(""); }
      } catch {
        if (alive) setErr("Can't reach the server");
      }
    }
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const l = data?.latest;
  const progress =
    data?.active && data.duration
      ? Math.min(100, Math.round(((data.elapsedSeconds ?? 0) / data.duration) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.25em] text-emerald-400">FREEZER PDI</div>
            <h1 className="text-2xl font-bold">Live Test</h1>
          </div>
          <div className="text-right text-sm text-slate-400">
            Station<br /><span className="font-semibold text-slate-200">{STATION_ID}</span>
          </div>
        </div>

        {err && <p className="mb-4 text-sm text-red-400">{err}</p>}

        {/* NO ACTIVE TEST */}
        {data && !data.active && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="text-xl font-semibold text-slate-300">No test running</div>
              <p className="mt-2 text-sm text-slate-500">
                Scan a freezer QR on the mobile page to start one.
              </p>
              <a href="/scan" className="mt-4 inline-block rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950">
                Go to Scan
              </a>
            </div>
            {data.lastCompleted && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Last completed test</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-semibold">{data.lastCompleted.freezerId}</span>
                  <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${statusColor(data.lastCompleted.overallResult)}`}>
                    {data.lastCompleted.overallResult === "PASS" ? "PDI PASSED" : "PDI FAILED"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTIVE TEST */}
        {data?.active && (
          <div className="space-y-5">
            {/* Freezer + countdown */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-sm text-slate-400">Freezer</div>
                  <div className="text-xl font-bold text-emerald-400">{data.freezerId}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">Time left</div>
                  <div className="font-mono text-4xl font-bold tabular-nums">
                    {mmss(data.remainingSeconds ?? 0)}
                  </div>
                </div>
              </div>
              {/* progress */}
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 text-right text-xs text-slate-500">{progress}%</div>
            </div>

            {/* Live cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label="VOLTAGE" value={l ? `${l.voltage.toFixed(1)} V` : "—"} status={l?.voltageStatus} />
              <MetricCard label="CURRENT" value={l ? `${l.current.toFixed(2)} A` : "—"} status={l?.currentStatus} />
              <MetricCard label="POWER" value={l ? `${l.power.toFixed(0)} W` : "—"} status={l?.powerStatus} />
              <MetricCard label="ENERGY" value={l ? `${l.energy.toFixed(2)} kWh` : "—"} />
              <MetricCard label="GAS" value={l ? String(l.gasValue) : "—"} status={l?.gasStatus} />
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-xs text-slate-400">STATUS</div>
                <div className="mt-1 text-lg font-bold text-emerald-400">TESTING</div>
              </div>
            </div>

            {!l && (
              <p className="text-center text-sm text-slate-500">
                Waiting for the first reading from the station…
              </p>
            )}
          </div>
        )}

        {!data && !err && <p className="text-slate-500">Loading…</p>}
      </div>
    </main>
  );
}

function MetricCard({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      {status && (
        <div className={`mt-2 inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${statusColor(status)}`}>
          {status.toUpperCase()}
        </div>
      )}
    </div>
  );
}