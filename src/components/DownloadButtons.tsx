"use client";
import { useState } from "react";
import { api, type RangeParams } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Export buttons. Each hits /api/download which returns ONLY the currently
 * filtered rows (same deviceId/range/search as the table).
 */
export function DownloadButtons({
  params,
}: {
  params: RangeParams & { search?: string };
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function download(format: "csv" | "xlsx" | "pdf") {
    try {
      setBusy(format);
      const url = api.downloadUrl(format, params);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? `energy-report.${format}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-brand-400 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      {(["csv", "xlsx", "pdf"] as const).map((f) => (
        <button
          key={f}
          onClick={() => download(f)}
          disabled={busy !== null}
          className={cn(btn)}
        >
          {busy === f ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
            </svg>
          )}
          {f === "xlsx" ? "Excel" : f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
