import type { Reading } from "../types";

const COLUMNS = ["Timestamp", "Current (A)", "Voltage (V)", "Power (W)", "Energy (kWh)"];

/** Build a CSV string from readings. Only the rows passed in are exported. */
export function buildCsv(readings: Reading[]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [COLUMNS.join(",")];
  for (const r of readings) {
    lines.push(
      [
        new Date(r.timestamp).toISOString(),
        r.current,
        r.voltage,
        r.power,
        r.energy,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}
