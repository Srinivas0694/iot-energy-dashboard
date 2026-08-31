"use client";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeviceSelector } from "@/components/DeviceSelector";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { LiveCards } from "@/components/LiveCards";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { SummaryStats } from "@/components/SummaryStats";
import { DataTable } from "@/components/DataTable";
import { DownloadButtons } from "@/components/DownloadButtons";
import { usePolling } from "@/hooks/usePolling";
import { api, type RangeParams } from "@/lib/api";
import type { Device, LatestPayload, RangePreset, SummaryStats as Stats } from "@/lib/types";
import { format, subDays } from "date-fns";

const REFRESH_MS = 3000; // live cards auto-refresh (2–5s window)

export default function DashboardPage() {
  // ---- Shared filter state ----
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<RangePreset>("today");
  const [from, setFrom] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");

  const rangeParams: RangeParams = useMemo(
    () => ({ deviceId, range, from, to }),
    [deviceId, range, from, to],
  );

  // ---- Devices (poll every 10s so new devices appear) ----
  const devicesResp = usePolling<{ devices: Device[] }>(() => api.devices(), 10000, []);
  const devices = devicesResp.data?.devices ?? [];
  // Default to the first device once loaded.
  const activeDeviceId = deviceId ?? devices[0]?.deviceId;

  // ---- Live latest reading ----
  const latest = usePolling<LatestPayload>(
    () => api.latest(activeDeviceId),
    REFRESH_MS,
    [activeDeviceId],
  );

  // ---- Chart series (refresh every 15s + on range change) ----
  const historical = usePolling(
    () => api.historical({ ...rangeParams, deviceId: activeDeviceId }),
    15000,
    [activeDeviceId, range, from, to],
  );

  // ---- Summary stats ----
  const summary = usePolling<{ summary: Stats }>(
    () => api.summary({ ...rangeParams, deviceId: activeDeviceId }),
    15000,
    [activeDeviceId, range, from, to],
  );

  const exportParams = { ...rangeParams, deviceId: activeDeviceId, search };

  return (
    <div className="min-h-screen">
      {/* ---- Top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L4.5 12.5H11l-1 9.5L19.5 11H13l0-9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-[var(--text)]">
                Energy Monitor
              </h1>
              <p className="text-xs text-[var(--muted)]">Real-time IoT telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {devices.length > 0 && (
              <div className="hidden sm:block">
                <DeviceSelector
                  devices={devices}
                  value={activeDeviceId}
                  onChange={setDeviceId}
                />
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
        {/* Error banner */}
        {(latest.error || historical.error) && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            Couldn’t reach the API. Retrying automatically… ({latest.error || historical.error})
          </div>
        )}

        {/* Mobile device selector */}
        {devices.length > 0 && (
          <div className="sm:hidden">
            <DeviceSelector devices={devices} value={activeDeviceId} onChange={setDeviceId} />
          </div>
        )}

        {/* Live cards */}
        <section className="animate-fade-in">
          <LiveCards data={latest.data} loading={latest.loading} />
        </section>

        {/* Range controls + downloads */}
        <section className="flex flex-wrap items-center justify-between gap-3">
          <DateRangeSelector
            range={range}
            from={from}
            to={to}
            onRange={setRange}
            onCustom={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
          <DownloadButtons params={exportParams} />
        </section>

        {/* Summary */}
        <SummaryStats stats={summary.data?.summary ?? null} loading={summary.loading} />

        {/* Charts */}
        <TelemetryCharts
          series={historical.data?.series ?? []}
          loading={historical.loading}
        />

        {/* Table */}
        <DataTable
          base={{ ...rangeParams, deviceId: activeDeviceId }}
          search={search}
          onSearch={setSearch}
        />

        <footer className="pb-8 pt-2 text-center text-xs text-[var(--muted)]">
          IoT Energy Dashboard · auto-refresh every {REFRESH_MS / 1000}s
        </footer>
      </main>
    </div>
  );
}
