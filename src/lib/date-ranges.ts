import {
  startOfDay,
  endOfDay,
  subDays,
} from "date-fns";
import type { RangePreset } from "./types";

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Resolve a preset (or an explicit custom range) into concrete from/to Dates.
 * All presets are computed relative to "now" in the server's timezone.
 */
export function resolveRange(
  preset: RangePreset,
  customFrom?: string | null,
  customTo?: string | null,
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "custom":
      return {
        from: customFrom ? startOfDay(new Date(customFrom)) : startOfDay(subDays(now, 6)),
        to: customTo ? endOfDay(new Date(customTo)) : endOfDay(now),
      };
    default:
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }
}

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  custom: "Custom Range",
};
