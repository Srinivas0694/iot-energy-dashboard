"use client";

// src/app/admin/page.tsx
// Create a freezer and print its QR label. Auto-suggests the next ID (editable).
// Requires: npm install qrcode.react

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import PdiNav from "@/components/PdiNav";

const FRZ_RE = /^FRZ-\d{4}-\d{6}$/;

export default function AdminPage() {
  const [code, setCode] = useState("");
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadNext() {
    setSaved(false);
    setMsg("");
    try {
      const res = await fetch("/api/freezers", { cache: "no-store" });
      const json = await res.json();
      setCode(json.nextId ?? "");
    } catch {
      setMsg("Couldn't reach the server.");
    }
  }

  useEffect(() => { loadNext(); }, []);

  const valid = FRZ_RE.test(code.trim().toUpperCase());

  async function save() {
    const freezerCode = code.trim().toUpperCase();
    if (!valid) { setMsg("ID must look like FRZ-2026-000001"); return; }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/freezers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freezerCode, model: model.trim() || null }),
      });
      const json = await res.json();
      if (res.ok && json.success) { setSaved(true); setMsg(""); }
      else setMsg(json.error || "Save failed.");
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  function printLabel() { window.print(); }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <style>{`
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .print-area { position: fixed; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; background: #fff; color: #000; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-2xl">
        <div className="no-print">
          <PdiNav />
          <div className="mb-5">
            <div className="text-xs font-bold tracking-[0.25em] text-emerald-400">FREEZER PDI</div>
            <h1 className="text-2xl font-bold">QR Label Generator</h1>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <label className="mb-1 block text-sm text-slate-400">Freezer ID</label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value); setSaved(false); }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono outline-none focus:border-emerald-400"
              />
              <button onClick={loadNext} className="rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300">
                Next ID
              </button>
            </div>
            {!valid && code && <p className="mt-1 text-xs text-amber-400">Format: FRZ-YYYY-NNNNNN</p>}

            <label className="mb-1 mt-4 block text-sm text-slate-400">Model (optional)</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. CF-300L"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={save}
                disabled={busy || !valid}
                className="flex-1 rounded-xl bg-emerald-400 py-3 font-bold text-slate-950 disabled:opacity-50"
              >
                {saved ? "Saved ✓" : busy ? "Saving…" : "Save freezer"}
              </button>
              <button
                onClick={printLabel}
                disabled={!valid}
                className="flex-1 rounded-xl border border-slate-700 py-3 font-semibold text-slate-200 disabled:opacity-50"
              >
                Print label
              </button>
            </div>
            {msg && <p className="mt-3 text-sm text-amber-400">{msg}</p>}
            {saved && <p className="mt-3 text-sm text-emerald-400">Freezer saved. You can print the label now.</p>}
          </div>

          {/* On-screen preview */}
          {valid && (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-slate-800 bg-white p-8">
              <QRCodeCanvas value={code.trim().toUpperCase()} size={220} level="M" includeMargin />
              <div className="mt-4 font-mono text-xl font-bold text-black">{code.trim().toUpperCase()}</div>
              {model && <div className="text-sm text-slate-600">{model}</div>}
            </div>
          )}
        </div>

        {/* Print-only area (one big label) */}
        {valid && (
          <div className="print-area hidden">
            <QRCodeCanvas value={code.trim().toUpperCase()} size={340} level="M" includeMargin />
            <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 28, fontWeight: 700 }}>
              {code.trim().toUpperCase()}
            </div>
            {model && <div style={{ fontSize: 16, color: "#333" }}>{model}</div>}
          </div>
        )}
      </div>
    </main>
  );
}