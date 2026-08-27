// src/lib/expire.ts
// Auto-close any RUNNING test that has run past its duration + grace.
// A real ESP32 that dies mid-test would otherwise leave the session RUNNING
// forever and block the station. Call this at the top of /start, /active, /live.

import { prisma } from "@/lib/prisma";

const GRACE_SECONDS = 30; // allow a little slack past the nominal duration

// Expire every overdue RUNNING session for a station (by internal station uuid).
// Overdue sessions are marked COMPLETED with overallResult = FAIL and status
// note EXPIRED-style semantics: we set results to FAIL because the test never
// produced a clean verdict. completedAt is set to started_at + duration.
export async function expireStaleTests(stationUuid: string) {
  const running = await prisma.testSession.findMany({
    where: { stationId: stationUuid, status: "RUNNING" },
  });

  const now = Date.now();
  for (const s of running) {
    const deadline = s.startedAt.getTime() + (s.durationSeconds + GRACE_SECONDS) * 1000;
    if (now > deadline) {
      await prisma.testSession.update({
        where: { id: s.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(s.startedAt.getTime() + s.durationSeconds * 1000),
          // No clean verdict was received -> record as FAIL so it isn't mistaken
          // for a passed unit. (overallResult null would read as "unknown".)
          voltageResult: s.voltageResult ?? "FAIL",
          currentResult: s.currentResult ?? "FAIL",
          powerResult: s.powerResult ?? "FAIL",
          gasResult: s.gasResult ?? "FAIL",
          overallResult: "FAIL",
        },
      });
      console.warn(`[PDI] auto-expired stale test ${s.id}`);
    }
  }
}