import type {
  LatestPayload,
  Reading,
  SummaryStats,
  RangePreset,
} from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export interface RangeParams {
  deviceId?: string;
  range: RangePreset;
  from?: string;
  to?: string;
}

function qs(params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") s.set(k, String(v));
  }
  return s.toString();
}

export const api = {
  latest: (deviceId?: string) =>
    getJson<LatestPayload>(`/api/latest?${qs({ deviceId })}`),

  historical: (p: RangeParams) =>
    getJson<{ series: Reading[]; count: number }>(
      `/api/historical?${qs(p as any)}`,
    ),

  summary: (p: RangeParams) =>
    getJson<{ summary: SummaryStats }>(`/api/summary?${qs(p as any)}`),

  devices: () =>
    getJson<{ devices: import("./types").Device[] }>(`/api/devices`),

  table: (
    p: RangeParams & {
      page: number;
      pageSize: number;
      sort: string;
      order: "asc" | "desc";
      search?: string;
    },
  ) =>
    getJson<{
      data: Reading[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    }>(`/api/device-data?${qs(p as any)}`),

  downloadUrl: (
    format: "csv" | "xlsx" | "pdf",
    p: RangeParams & { search?: string },
  ) => `/api/download?${qs({ format, ...(p as any) })}`,
};
