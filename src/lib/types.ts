// Shared types used by both the API layer and the React components.

export type MetricKey = "current" | "voltage" | "power" | "energy";

export interface Reading {
  id: string;
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  timestamp: string; // ISO string
  gas?: number | null;
  gasStatus?: string | null;
}

export interface Device {
  deviceId: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "IDLE";
  lastSeenAt: string | null;
}

export interface LatestPayload {
  device: Device | null;
  reading: Reading | null;
  // Online is derived server-side from lastSeenAt vs. the offline threshold.
  online: boolean;
}

export interface SummaryStats {
  avgVoltage: number;
  avgCurrent: number;
  totalEnergy: number; // kWh consumed across the range (max - min)
  peakPower: number;
  minVoltage: number;
  maxVoltage: number;
  sampleCount: number;
}

export type RangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

// Payload the ESP32 firmware POSTs to /api/device-data
export interface DeviceDataInput {
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  timestamp?: string;
  gasADC?: number;
  gasStatus?: string;
}