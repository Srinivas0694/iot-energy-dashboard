"use client";

// src/app/scan/page.tsx
// Operator-facing: scan a freezer QR with the phone camera (or type it),
// then START TEST -> POST /api/test/start. Mobile-first.
//
// Requires: npm install html5-qrcode
// Camera needs a secure context: works on https:// (Vercel) and on
// http://localhost during dev. It will NOT work over a plain http LAN IP.

import { useEffect, useRef, useState } from "react";

const STATION_ID = process.env.NEXT_PUBLIC_STATION_ID ?? "STATION-01";
const FREEZER_RE = /^FRZ-\d{4}-\d{6}$/i; // FRZ-2026-000001 (soft check)

type Phase = "idle" | "scanning" | "review" | "starting" | "started" | "error";

export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [freezerId, setFreezerId] = useState("");
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");
  const [testId, setTestId] = useState("");

  // html5-qrcode instance kept in a ref so we can stop it on unmount.
  const scannerRef = useRef<any>(null);
  const runningRef = useRef(false);

  async function stopScanner() {
    try {
      if (scannerRef.current && runningRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {
      /* ignore */
    }
    runningRef.current = false;
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    setMessage("");
    setPhase("scanning");
    // Dynamic import so the lib never runs during SSR.
    const { Html5Qrcode } = await import("html5-qrcode");
    // Give React a tick to render the #qr-reader div.
    setTimeout(async () => {
      try {
        const html5 = new Html5Qrcode("qr-reader");
        scannerRef.current = html5;
        runningRef.current = true;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText: string) => {
            await stopScanner();
            onDecoded(decodedText);
          },
          () => {
            /* per-frame decode failures: ignore */
          }
        );
      } catch (e: any) {
        runningRef.current = false;
        setMessage(
          "Could not open the camera. Allow camera access, or use manual entry below."
        );
        setPhase("idle");
      }
    }, 50);
  }

  function onDecoded(text: string) {
    const code = text.trim().toUpperCase();
    setFreezerId(code);
    setPhase("review");
    if (!FREEZER_RE.test(code)) {
      setMessage("Scanned code doesn't look like FRZ-YYYY-NNNNNN — check it before starting.");
    } else {
      setMessage("");
    }
  }

  function useManual() {
    const code = manual.trim().toUpperCase();
    if (!code) return;
    setFreezerId(code);
    setPhase("review");
    setMessage(FREEZER_RE.test(code) ? "" : "That code doesn't match FRZ-YYYY-NNNNNN — double-check it.");
  }

  async function startTest() {
    setPhase("starting");
    setMessage("");
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId: STATION_ID, freezerId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestId(data.testId);
        setPhase("started");
      } else if (res.status === 409) {
        setPhase("error");
        setMessage("This station already has a test running. Finish it before starting a new one.");
      } else {
        setPhase("error");
        setMessage(data.error || `Start failed (HTTP ${res.status}).`);
      }
    } catch {
      setPhase("error");
      setMessage("Network error — is the station online?");
    }
  }

  function reset() {
    setFreezerId("");
    setManual("");
    setTestId("");
    setMessage("");
    setPhase("idle");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="text-xs font-bold tracking-[0.25em] text-emerald-400">
            FREEZER PDI
          </div>
          <h1 className="mt-1 text-2xl font-bold">Scan Freezer</h1>
          <div className="mt-1 text-sm text-slate-400">
            Station <span className="font-semibold text-slate-200">{STATION_ID}</span>
          </div>
        </div>

        {/* IDLE */}
        {phase === "idle" && (
          <div className="space-y-4">
            <button
              onClick={startScanner}
              className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950 active:scale-[0.99] transition"
            >
              Scan QR Code
            </button>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <label className="mb-2 block text-sm text-slate-400">
                Or enter the Freezer ID manually
              </label>
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="FRZ-2026-000001"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base outline-none focus:border-emerald-400"
              />
              <button
                onClick={useManual}
                className="mt-3 w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-200 active:scale-[0.99] transition"
              >
                Use this ID
              </button>
            </div>
            {message && <p className="text-sm text-amber-400">{message}</p>}
          </div>
        )}

        {/* SCANNING */}
        {phase === "scanning" && (
          <div className="space-y-4">
            <div
              id="qr-reader"
              className="overflow-hidden rounded-2xl border border-slate-800 bg-black"
            />
            <p className="text-center text-sm text-slate-400">
              Point the camera at the freezer's QR code
            </p>
            <button
              onClick={async () => {
                await stopScanner();
                setPhase("idle");
              }}
              className="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* REVIEW */}
        {phase === "review" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="text-sm text-slate-400">Freezer ID</div>
              <div className="mt-1 text-2xl font-bold tracking-wide text-emerald-400">
                {freezerId}
              </div>
              <div className="mt-4 text-sm text-slate-400">Station</div>
              <div className="text-lg font-semibold">{STATION_ID}</div>
            </div>
            {message && <p className="text-sm text-amber-400">{message}</p>}
            <button
              onClick={startTest}
              className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950 active:scale-[0.99] transition"
            >
              START TEST
            </button>
            <button
              onClick={reset}
              className="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-300"
            >
              Scan a different freezer
            </button>
          </div>
        )}

        {/* STARTING */}
        {phase === "starting" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-lg font-semibold">Starting test…</div>
            <div className="mt-2 text-sm text-slate-400">{freezerId}</div>
          </div>
        )}

        {/* STARTED */}
        {phase === "started" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
              <div className="text-3xl font-extrabold text-emerald-400">TEST RUNNING</div>
              <div className="mt-3 text-sm text-slate-300">{freezerId}</div>
              <div className="mt-1 text-xs text-slate-500 break-all">Test ID: {testId}</div>
              <p className="mt-4 text-sm text-slate-400">
                The station will run the 5-minute test. You can close this page — the test
                continues on its own.
              </p>
            </div>
            <button
              onClick={reset}
              className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950"
            >
              Scan next freezer
            </button>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
              <div className="text-xl font-bold text-red-400">Couldn't start</div>
              <p className="mt-2 text-sm text-slate-300">{message}</p>
            </div>
            <button
              onClick={() => setPhase("review")}
              className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-slate-950"
            >
              Try again
            </button>
            <button
              onClick={reset}
              className="w-full rounded-xl border border-slate-700 py-3 font-semibold text-slate-300"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </main>
  );
}