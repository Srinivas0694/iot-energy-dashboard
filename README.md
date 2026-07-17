# ⚡ IoT Energy Monitoring Dashboard

A production-ready, real-time dashboard for IoT electrical metering devices (ESP32 / PZEM-004T etc.).
Built with **Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + Recharts + Tailwind**.

Live monitoring, interactive time-series charts, a searchable/sortable/paginated history table,
and one-click **CSV / Excel / PDF** reports — all multi-device from day one.

---

## ✨ Features

- **Live monitoring cards** — Current (A), Voltage (V), Power (W), Energy (kWh), device Online/Offline, last updated. Auto-refresh every 3s.
- **Interactive charts** — Current / Voltage / Power / Energy vs time with Today · Yesterday · Last 7 · Last 30 · Custom range.
- **Historical table** — search, column sorting, pagination, date filtering; polls live.
- **Exports** — download the *currently filtered* data as CSV, Excel (`.xlsx`), or a branded PDF report (logo placeholder, title, range, summary stats, full table).
- **Summary stats** — Avg Voltage/Current, Total Energy, Peak Power, Min/Max Voltage.
- **Multi-device ready** — Device ID, Name, Location, Status. Unknown devices auto-register on first POST.
- **Light/Dark mode**, responsive (desktop/tablet/mobile), loading skeletons, error handling, Poppins throughout.

---

## 🧱 Tech Stack

| Layer     | Choice                                        |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 14 (App Router), React 18, TypeScript |
| Styling   | Tailwind CSS, Poppins (via `next/font`)       |
| Charts    | Recharts                                      |
| Backend   | Next.js API Routes (Node runtime)             |
| Database  | PostgreSQL via Prisma ORM                     |
| Exports   | ExcelJS (xlsx), jsPDF + autotable (pdf)       |

> Everything (frontend + API) deploys to **Vercel** as one app. If you'd rather run the API
> separately on Render/Railway, the `src/app/api/*` route handlers map 1:1 to Express routes.

---

## 📁 Project Structure

```
iot-energy-dashboard/
├── prisma/
│   └── schema.prisma            # Device + Reading models (multi-device)
├── scripts/
│   └── seed.ts                  # 24h of demo data across 2 devices
├── firmware-example/
│   └── esp32_freezer_monitor.ino  # Arduino sketch that POSTs readings
├── public/
│   └── logo.svg                 # Logo placeholder (used in header + reports)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Poppins + theme provider
│   │   ├── globals.css
│   │   ├── providers.tsx        # next-themes
│   │   ├── page.tsx             # Dashboard (composes everything)
│   │   └── api/
│   │       ├── device-data/route.ts   # POST ingest + GET paginated table
│   │       ├── latest/route.ts        # GET latest reading + online status
│   │       ├── historical/route.ts    # GET chart series (downsampled)
│   │       ├── summary/route.ts       # GET aggregate statistics
│   │       ├── devices/route.ts       # GET list / POST upsert device
│   │       └── download/route.ts      # GET csv|xlsx|pdf (filtered export)
│   ├── components/              # LiveCards, Charts, DataTable, Downloads, …
│   ├── hooks/usePolling.ts      # Generic auto-refresh hook
│   └── lib/
│       ├── prisma.ts  types.ts  api.ts  date-ranges.ts  utils.ts
│       └── download/  csv.ts  excel.ts  pdf.ts
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ (or 20+)
- A PostgreSQL database (local, or free tier on **Neon / Supabase / Railway / Render**)

### 2. Install
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/energy?schema=public"
DEVICE_API_KEY="a-long-random-string"   # firmware sends this in x-api-key (blank = disabled)
```

### 4. Create the schema + seed demo data
```bash
npm run db:push     # creates tables from prisma/schema.prisma
npm run db:seed     # optional: 24h of demo readings so the UI isn't empty
```

### 5. Run
```bash
npm run dev
```
Open **http://localhost:3000**.

---

## 🔌 API Reference

### `POST /api/device-data` — ingest a reading
Header (if `DEVICE_API_KEY` is set): `x-api-key: <DEVICE_API_KEY>`
```json
{
  "deviceId": "DEVICE001",
  "voltage": 230.5,
  "current": 2.34,
  "power": 538.4,
  "energy": 15.62,
  "timestamp": "2026-07-17T10:30:00Z"
}
```
`timestamp` is optional (defaults to server time). Unknown `deviceId`s auto-register.

Quick test:
```bash
curl -X POST http://localhost:3000/api/device-data \
  -H "Content-Type: application/json" \
  -H "x-api-key: a-long-random-string" \
  -d '{"deviceId":"DEVICE001","voltage":230.5,"current":2.34,"power":538.4,"energy":15.62}'
```

### GET endpoints
| Endpoint | Purpose | Key query params |
|----------|---------|------------------|
| `/api/latest` | Most recent reading + online status | `deviceId` |
| `/api/historical` | Time-series for charts (downsampled) | `deviceId`, `range`, `from`, `to` |
| `/api/summary` | Aggregate statistics | `deviceId`, `range`, `from`, `to` |
| `/api/device-data` | Paginated table feed | `deviceId`, `range`, `page`, `pageSize`, `sort`, `order`, `search` |
| `/api/devices` | List devices (`GET`) / upsert (`POST`) | — |
| `/api/download` | Export filtered data | `format=csv\|xlsx\|pdf`, `deviceId`, `range`, `from`, `to`, `search` |

`range` ∈ `today · yesterday · last7 · last30 · custom`. For `custom`, pass `from`/`to` as `YYYY-MM-DD`.

---

## 📟 Connecting your ESP32

See `firmware-example/esp32_freezer_monitor.ino`. Set your WiFi, the deployed `SERVER` URL,
and the same `API_KEY` as `DEVICE_API_KEY`. Feed real values from your energy meter
(e.g. PZEM-004T over UART) instead of the demo values, then flash.

---

## ☁️ Deployment (Vercel + hosted Postgres)

1. Push this repo to GitHub.
2. Create a Postgres DB (Neon/Supabase/Railway) and copy its connection string.
3. Import the repo in **Vercel** → add env vars `DATABASE_URL` and `DEVICE_API_KEY`.
4. Deploy. The `build` script runs `prisma generate` automatically.
5. Apply the schema once against the production DB:
   ```bash
   DATABASE_URL="<prod-url>" npm run db:push
   ```
6. Point your device's `SERVER` at `https://<your-app>.vercel.app/api/device-data`.

**Separate backend on Render/Railway?** Deploy the same repo there as a Node service and set
`DATABASE_URL`; the API routes work unchanged. Or port `src/app/api/*` handlers into an Express app.

---

## 🔧 Extending

- **More metrics** — add a column to `Reading` in `schema.prisma`, run `db:push`, surface it in `MetricCard`/charts.
- **Real auth** — `ADMIN_USERNAME`/`ADMIN_PASSWORD` are stubbed in `.env`; wrap `page.tsx` in a NextAuth/middleware gate.
- **Alerts** — add a threshold check in `POST /api/device-data` and trigger email/webhook.

---

## 📜 Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run db:push` | Sync schema to the database |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Open Prisma Studio |
