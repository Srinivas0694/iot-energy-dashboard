"use client";
import { RANGE_LABELS } from "@/lib/date-ranges";
import type { RangePreset } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS: RangePreset[] = ["today", "yesterday", "last7", "last30", "custom"];

/** Segmented range presets + inline custom date pickers. */
export function DateRangeSelector({
  range,
  from,
  to,
  onRange,
  onCustom,
}: {
  range: RangePreset;
  from: string;
  to: string;
  onRange: (r: RangePreset) => void;
  onCustom: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onRange(p)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              range === p
                ? "bg-brand-600 text-white shadow-sm"
                : "text-[var(--muted)] hover:text-brand-600",
            )}
          >
            {RANGE_LABELS[p]}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2 animate-fade-in">
          <input
            type="date"
            value={from}
            onChange={(e) => onCustom(e.target.value, to)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <span className="text-[var(--muted)]">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onCustom(from, e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      )}
    </div>
  );
}
