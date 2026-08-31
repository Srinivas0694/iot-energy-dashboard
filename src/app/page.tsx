"use client";

// src/app/console/page.tsx
// Unified dashboard: Scan / Live / History switch in-place via a top tab bar.
// Report still opens at /report/[id] (its own shareable URL).
// Reuses the same public API routes — no backend changes.

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const STATION_ID = process.env.NEXT_PUBLIC_STATION_ID ?? "STATION-01";
type Tab = "scan" | "live" | "history";

export default function ConsolePage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.25em] text-emerald-400">FREEZER PDI</div>
            <h1 className="text-2xl font-bold">Console</h1>
          </div>
          <div className="text-right text-sm text-slate-400">
            Station<br /><span className="font-semibold text-slate-200">{STATION_ID}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1">
          {(["scan", "live", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
                tab === t ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "scan" && <ScanPanel onStarted={() => setTab("live")} />}
        {tab === "live" && <LivePanel />}
        {tab === "history" && <HistoryPanel />}
      </div>
    </main>
  );
}

/* ============================ SCAN ============================ */
function ScanPanel({ onStarted }: { onStarted: () => void }) {
  const [manual, setManual] = useState("");
  const [freezerId, setFreezerId] = useState("");
  const [phase, setPhase] = useState<"idle" | "review" | "starting" | "started" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [testId, setTestId] = useState("");

  function useCode() {
    const v = manual.trim().toUpperCase();
    if (!v) return;
    setFreezerId(v);
    setPhase("review");
  }

  async function startTest() {
    setPhase("starting"); setMsg("");
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId: STATION_ID, freezerId }),
      });
      const data = await res.json();
      if (res.ok && data.success) { setTestId(data.testId); setPhase("started"); }
      else if (res.status === 409) { setPhase("error"); setMsg("This station already has a test running."); }
      else { setPhase("error"); setMsg(data.error || `Start failed (${res.status}).`); }
    } catch { setPhase("error"); setMsg("Network error."); }
  }

  function reset() { setManual(""); setFreezerId(""); setTestId(""); setMsg(""); setPhase("idle"); }

  return (
    <div className="space-y-4">
      {phase === "idle" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="mb-2 block text-sm text-slate-400">Enter the freezer serial / code</label>
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && useCode()}
              placeholder="Freezer serial / code"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />
            <button onClick={useCode} className="rounded-xl bg-emerald-400 px-5 font-bold text-slate-950">Use</button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            On a phone, use the mobile app or the <a href="/scan" className="text-emerald-400">camera scan page</a> to scan a QR/barcode.
          </p>
          {!!msg && <p className="mt-3 text-sm text-amber-400">{msg}</p>}
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">Freezer</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">{freezerId}</div>
            <div className="mt-4 text-sm text-slate-400">Station</div>
            <div className="text-lg font-semibold">{STATION_ID}</div>
          </div>
          <button onClick={startTest} className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950">START TEST</button>
          <button onClick={reset} className="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-300">Different freezer</button>
        </div>
      )}

      {phase === "starting" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="text-lg font-semibold">Starting test…</div>
        </div>
      )}

      {phase === "started" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
            <div className="text-3xl font-extrabold text-emerald-400">TEST RUNNING</div>
            <div className="mt-3 text-sm text-slate-300">{freezerId}</div>
            <div className="mt-1 text-xs text-slate-500 break-all">Test ID: {testId}</div>
          </div>
          <button onClick={onStarted} className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950">Watch live →</button>
          <button onClick={reset} className="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-300">Scan next</button>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <div className="text-xl font-bold text-red-400">Couldn't start</div>
            <p className="mt-2 text-sm text-slate-300">{msg}</p>
          </div>
          <button onClick={() => setPhase("review")} className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-slate-950">Try again</button>
          <button onClick={reset} className="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-300">Start over</button>
        </div>
      )}
    </div>
  );
}

/* ============================ LIVE ============================ */
function statusColor(s?: string) {
  switch ((s ?? "").toUpperCase()) {
    case "PASS": case "SAFE": return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    case "WARN": case "WARNING": return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    case "FAIL": case "LEAK": return "text-red-400 border-red-500/40 bg-red-500/10";
    default: return "text-slate-400 border-slate-700 bg-slate-800/40";
  }
}
function mmss(s: number) { const m = Math.floor(s / 60); return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

function LivePanel() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let on = true;
    const tick = async () => {
      try { const r = await fetch(`/api/test/live?stationId=${STATION_ID}`, { cache: "no-store" }); const j = await r.json(); if (on) setData(j); } catch {}
    };
    tick(); const id = setInterval(tick, 2000);
    return () => { on = false; clearInterval(id); };
  }, []);

  const l = data?.latest;
  const progress = data?.active && data.duration ? Math.min(100, Math.round(((data.elapsedSeconds ?? 0) / data.duration) * 100)) : 0;

  if (!data) return <p className="text-slate-500">Loading…</p>;

  if (!data.active) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="text-xl font-semibold text-slate-300">No test running</div>
          <p className="mt-2 text-sm text-slate-500">Start one from the Scan tab.</p>
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
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-end justify-between">
          <div><div className="text-sm text-slate-400">Freezer</div><div className="text-xl font-bold text-emerald-400">{data.freezerId}</div></div>
          <div className="text-right"><div className="text-sm text-slate-400">Time left</div><div className="font-mono text-4xl font-bold tabular-nums">{mmss(data.remainingSeconds ?? 0)}</div></div>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
        <div className="mt-1 text-right text-xs text-slate-500">{progress}%</div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="VOLTAGE" value={l ? `${l.voltage.toFixed(1)} V` : "—"} status={l?.voltageStatus} />
        <Metric label="CURRENT" value={l ? `${l.current.toFixed(2)} A` : "—"} status={l?.currentStatus} />
        <Metric label="POWER" value={l ? `${l.power.toFixed(0)} W` : "—"} status={l?.powerStatus} />
        <Metric label="ENERGY" value={l ? `${l.energy.toFixed(2)} kWh` : "—"} />
        <Metric label="GAS" value={l ? String(l.gasValue) : "—"} status={l?.gasStatus} />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="text-xs text-slate-400">STATUS</div><div className="mt-1 text-lg font-bold text-emerald-400">TESTING</div>
        </div>
      </div>
      {!l && <p className="text-center text-sm text-slate-500">Waiting for the first reading…</p>}
    </div>
  );
}
function Metric({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      {status && <div className={`mt-2 inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${statusColor(status)}`}>{status.toUpperCase()}</div>}
    </div>
  );
}

/* ============================ HISTORY ============================ */
function HistoryPanel() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ stationId: STATION_ID, limit: "100" });
    if (q) p.set("q", q);
    if (filter !== "ALL") p.set("result", filter);
    try { const r = await fetch(`/api/tests?${p.toString()}`, { cache: "no-store" }); const j = await r.json(); setTests(j.tests ?? []); }
    finally { setLoading(false); }
  }, [q, filter]);

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search freezer…" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 outline-none focus:border-emerald-400" />
          <button onClick={load} className="rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950">Search</button>
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
          {(["ALL", "PASS", "FAIL"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${filter === f ? "bg-slate-700 text-white" : "text-slate-400"}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-slate-500">Loading…</p> : tests.length === 0 ? <p className="text-slate-500">No tests found.</p> : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-slate-400">
              <tr><th className="px-4 py-3">Freezer</th><th className="px-4 py-3 hidden sm:table-cell">Date</th><th className="px-4 py-3">Result</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.testId} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-semibold">{t.freezerId}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-400">{new Date(t.completedAt ?? t.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${statusColor(t.status === "RUNNING" ? "WARN" : t.overallResult ?? "")}`}>{t.status === "RUNNING" ? "RUNNING" : t.overallResult ?? "—"}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => router.push(`/report/${t.testId}`)} className="font-semibold text-emerald-400 hover:underline">View →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}