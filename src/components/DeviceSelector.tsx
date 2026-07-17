"use client";
import type { Device } from "@/lib/types";

/** Dropdown to switch the active device (multi-device ready). */
export function DeviceSelector({
  devices,
  value,
  onChange,
}: {
  devices: Device[];
  value: string | undefined;
  onChange: (deviceId: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-[var(--muted)]">Device</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        {devices.length === 0 && <option value="">No devices</option>}
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.name}
            {d.location ? ` — ${d.location}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
