"use client";

// src/app/history/page.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import PdiNav from "@/components/PdiNav";

const STATION_ID = process.env.NEXT_PUBLIC_STATION_ID ?? "STATION-01";

type Test = {
  testId: string;
  freezerId: string;
  status: string;
  overallResult: string | null;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}
function resultPill(r: string | null, status: string) {
  if (status === "RUNNING") return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  if (r === "PASS") return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (r === "FAIL") return "text-red-400 border-red-500/40 bg-red-500/10";
  return "text-slate-400 border-slate-700 bg-slate-800/40";
}
function resultLabel(r: string | null, status: string) {
  if (status === "RUNNING") return "RUNNING";
  return r ?? "—";
}

export default function HistoryPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ stationId: STATION_ID, limit: "100" });
    if (q) params.set("q", q);
    if (filter !== "ALL") params.set("result", filter);
    try {
      const res = await fetch(`/api/tests?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setTests(json.tests ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <PdiNav />

        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.25em] text-emerald-400">FREEZER PDI</div>
            <h1 className="text-2xl font-bold">Test History</h1>
          </div>
          <div className="text-right text-sm text-slate-400">
            Station<br /><span className="font-semibold text-slate-200">{STATION_ID}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search freezer ID…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 outline-none focus:border-emerald-400"
            />
            <button onClick={load} className="rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950">
              Search
            </button>
          </div>
          <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
            {(["ALL", "PASS", "FAIL"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${
                  filter === f ? "bg-slate-700 text-white" : "text-slate-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : tests.length === 0 ? (
          <p className="text-slate-500">No tests found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Freezer</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Duration</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.testId} className="border-t border-slate-800 hover:bg-slate-900/60">
                    <td className="px-4 py-3 font-semibold">{t.freezerId}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-400">{fmt(t.completedAt ?? t.startedAt)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-400">{Math.round(t.durationSeconds / 60)} min</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${resultPill(t.overallResult, t.status)}`}>
                        {resultLabel(t.overallResult, t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/report/${t.testId}`} className="font-semibold text-emerald-400 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}