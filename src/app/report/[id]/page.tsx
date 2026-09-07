"use client";

// src/app/report/[id]/page.tsx
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PdiNav from "@/components/PdiNav";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// Threshold lines drawn on the charts. Keep these in sync with the ESP32 firmware.
const TH = {
  voltage: { min: 200, max: 250 },
  current: { min: 0.8, max: 2.5 },
  power: { min: 120, max: 400 },
  gas: 1000,
};

type Reading = {
  elapsedSeconds: number;
  voltage: number; current: number; power: number; energy: number; gasValue: number;
};
type Test = {
  testId: string; freezerId: string; stationId: string; status: string;
  startedAt: string; completedAt: string | null; durationSeconds: number;
  voltageResult: string | null; currentResult: string | null;
  powerResult: string | null; gasResult: string | null; overallResult: string | null;
};

function fmt(d?: string | null) { return d ? new Date(d).toLocaleString() : "—"; }
function mmss(s: number) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }

function ResultRow({ label, r }: { label: string; r: string | null }) {
  const cls = r === "PASS" ? "text-emerald-400" : r === "FAIL" ? "text-red-400" : "text-slate-500";
  return (
    <div className="flex items-center justify-between border-b border-slate-800 py-2 last:border-0">
      <span className="text-slate-300">{label}</span>
      <span className={`font-bold ${cls}`}>{r ?? "—"}</span>
    </div>
  );
}

function Chart({
  title, data, dataKey, unit, min, max,
}: { title: string; data: Reading[]; dataKey: keyof Reading; unit: string; min?: number; max?: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 text-sm font-semibold text-slate-300">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="elapsedSeconds" tickFormatter={mmss} stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
            labelFormatter={(v) => `t = ${mmss(Number(v))}`}
            formatter={(val: any) => [`${val} ${unit}`, title]}
          />
          {min !== undefined && <ReferenceLine y={min} stroke="#ef4444" strokeDasharray="4 4" />}
          {max !== undefined && <ReferenceLine y={max} stroke="#ef4444" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey={dataKey as string} stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/tests/${id}`, { cache: "no-store" });
        if (res.status === 404) { setNotFound(true); return; }
        const json = await res.json();
        setTest(json.test);
        setReadings(json.readings ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const failures: string[] = [];
  if (test) {
    if (test.voltageResult === "FAIL") failures.push("Voltage went out of the allowed range.");
    if (test.currentResult === "FAIL") failures.push("Current went out of the allowed range.");
    if (test.powerResult === "FAIL") failures.push("Power went out of the allowed range.");
    if (test.gasResult === "FAIL") failures.push("Gas leak detected during the test.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <PdiNav />

        <Link href="/history" className="text-sm text-slate-400 hover:text-emerald-400">← Back to history</Link>

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : notFound || !test ? (
          <p className="mt-6 text-slate-500">Test not found.</p>
        ) : (
          <>
            {/* Header + verdict */}
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-sm text-slate-400">Freezer</div>
                <div className="text-2xl font-bold text-emerald-400">{test.freezerId}</div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-slate-400">Station</span><span>{test.stationId}</span>
                  <span className="text-slate-400">Started</span><span>{fmt(test.startedAt)}</span>
                  <span className="text-slate-400">Completed</span><span>{fmt(test.completedAt)}</span>
                  <span className="text-slate-400">Duration</span><span>{Math.round(test.durationSeconds / 60)} min</span>
                </div>
              </div>
              <div className="flex w-full flex-col justify-center rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:w-56">
                <div className="text-center text-sm text-slate-400">Overall</div>
                <div className={`mt-1 text-center text-3xl font-extrabold ${test.overallResult === "PASS" ? "text-emerald-400" : "text-red-400"}`}>
                  {test.overallResult === "PASS" ? "PDI PASSED" : test.overallResult === "FAIL" ? "PDI FAILED" : (test.status ?? "—")}
                </div>
                <div className="mt-4">
                  <ResultRow label="Voltage" r={test.voltageResult} />
                  <ResultRow label="Current" r={test.currentResult} />
                  <ResultRow label="Power" r={test.powerResult} />
                  <ResultRow label="Gas" r={test.gasResult} />
                </div>
              </div>
            </div>

            {/* Failure reasons */}
            {failures.length > 0 && (
              <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
                <div className="mb-1 font-bold text-red-400">Failure reasons</div>
                <ul className="list-inside list-disc text-sm text-slate-300">
                  {failures.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            {/* Charts */}
            {readings.length === 0 ? (
              <p className="mt-6 text-slate-500">No readings were recorded for this test.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Chart title="Voltage (V)" data={readings} dataKey="voltage" unit="V" min={TH.voltage.min} max={TH.voltage.max} />
                <Chart title="Current (A)" data={readings} dataKey="current" unit="A" min={TH.current.min} max={TH.current.max} />
                <Chart title="Power (W)" data={readings} dataKey="power" unit="W" min={TH.power.min} max={TH.power.max} />
                <Chart title="Gas (ADC)" data={readings} dataKey="gasValue" unit="" max={TH.gas} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}