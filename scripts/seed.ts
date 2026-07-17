/**
 * Seed the database with two demo devices and ~24h of realistic readings,
 * so the dashboard has something to show before the real device is wired up.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const devices = [
    { deviceId: "DEVICE001", name: "Main Panel", location: "Plant A · Feeder 1" },
    { deviceId: "DEVICE002", name: "Compressor Room", location: "Plant A · Feeder 3" },
  ];

  for (const d of devices) {
    await prisma.device.upsert({
      where: { deviceId: d.deviceId },
      create: { ...d, status: "ONLINE", lastSeenAt: new Date() },
      update: { ...d },
    });
    // Clear existing demo readings for a clean seed.
    await prisma.reading.deleteMany({ where: { deviceId: d.deviceId } });
  }

  const now = Date.now();
  const HOURS = 24;
  const EVERY_MS = 60_000; // one reading per minute
  const points = (HOURS * 60 * 60 * 1000) / EVERY_MS;

  for (const d of devices) {
    let energy = 100 + Math.random() * 50; // cumulative kWh baseline
    const rows: any[] = [];
    for (let i = points; i >= 0; i--) {
      const t = new Date(now - i * EVERY_MS);
      // A gentle daily load curve + noise.
      const hour = t.getHours() + t.getMinutes() / 60;
      const load = 0.4 + 0.5 * Math.sin(((hour - 6) / 24) * Math.PI * 2) ** 2;
      const voltage = 228 + Math.sin(hour) * 3 + (Math.random() - 0.5) * 2;
      const current = Math.max(0.1, (2 + load * 6) + (Math.random() - 0.5) * 0.6);
      const power = voltage * current * 0.98;
      energy += (power / 1000) * (EVERY_MS / 3_600_000);
      rows.push({
        deviceId: d.deviceId,
        voltage: +voltage.toFixed(2),
        current: +current.toFixed(3),
        power: +power.toFixed(2),
        energy: +energy.toFixed(3),
        timestamp: t,
      });
    }
    // Batch insert.
    await prisma.reading.createMany({ data: rows });
    console.log(`Seeded ${rows.length} readings for ${d.deviceId}`);
  }
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
