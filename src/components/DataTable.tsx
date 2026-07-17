"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/Card";
import { api, type RangeParams } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { cn, fmt } from "@/lib/utils";
import type { Reading } from "@/lib/types";
import { format } from "date-fns";

type SortKey = "timestamp" | "current" | "voltage" | "power" | "energy";

const COLUMNS: { key: SortKey; label: string; decimals?: number }[] = [
  { key: "timestamp", label: "Timestamp" },
  { key: "current", label: "Current (A)", decimals: 2 },
  { key: "voltage", label: "Voltage (V)", decimals: 1 },
  { key: "power", label: "Power (W)", decimals: 1 },
  { key: "energy", label: "Energy (kWh)", decimals: 2 },
];

/**
 * Historical data table with debounced search, column sorting, pagination.
 * `search` is lifted so the parent can pass it to the export buttons.
 */
export function DataTable({
  base,
  search,
  onSearch,
}: {
  base: RangeParams;
  search: string;
  onSearch: (v: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortKey>("timestamp");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [debounced, setDebounced] = useState(search);

  // Debounce the search box so we aren't querying on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => setPage(1), [debounced, sort, order, pageSize, base.range, base.deviceId, base.from, base.to]);

  const fetcher = useMemo(
    () => () =>
      api.table({ ...base, page, pageSize, sort, order, search: debounced }),
    [base, page, pageSize, sort, order, debounced],
  );

  // Poll the table too, so new rows appear live (every 5s).
  const { data, loading } = usePolling(fetcher, 5000, [
    base.deviceId, base.range, base.from, base.to, page, pageSize, sort, order, debounced,
  ]);

  const rows: Reading[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  function toggleSort(key: SortKey) {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("desc");
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Historical Data</h3>
          <p className="text-xs text-[var(--muted)]">
            {total.toLocaleString()} records
          </p>
        </div>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search a value (e.g. 230)"
            className="w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={cn(
                    "cursor-pointer select-none px-4 py-3 font-semibold text-[var(--muted)]",
                    c.key === "timestamp" ? "text-left" : "text-right",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sort === c.key && (
                      <span className="text-brand-500">{order === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <div className="skeleton h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-[var(--muted)]">
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] transition-colors hover:bg-[var(--bg)]"
                >
                  <td className="tnum px-4 py-3 text-left text-[var(--text)]">
                    {format(new Date(r.timestamp), "dd MMM yyyy, HH:mm:ss")}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[var(--text)]">{fmt(r.current, 2)}</td>
                  <td className="tnum px-4 py-3 text-right text-[var(--text)]">{fmt(r.voltage, 1)}</td>
                  <td className="tnum px-4 py-3 text-right text-[var(--text)]">{fmt(r.power, 1)}</td>
                  <td className="tnum px-4 py-3 text-right text-[var(--text)]">{fmt(r.energy, 2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)]"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <PageBtn disabled={page <= 1} onClick={() => setPage(1)}>«</PageBtn>
          <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</PageBtn>
          <span className="tnum px-3 text-sm text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</PageBtn>
          <PageBtn disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</PageBtn>
        </div>
      </div>
    </Card>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
