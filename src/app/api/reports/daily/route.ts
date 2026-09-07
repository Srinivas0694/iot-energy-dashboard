// src/app/api/reports/daily/route.ts
// The daily job. Called by Vercel Cron (and manually with ?token=CRON_SECRET).
//   GET /api/reports/daily            (cron sends its own auth header)
//   GET /api/reports/daily?token=...&date=YYYY-MM-DD   (manual test)
//
// Fetches today's (IST) COMPLETED tests, builds PDF+XLSX+CSV, emails them,
// and logs the run in report_jobs. No-data days send a "no tests" email
// with no attachments. READ-ONLY on all PDI tables.

import { prisma } from "@/lib/prisma";
import { getDailyReport, istToday } from "@/lib/reports/data";
import { buildDailyPdf } from "@/lib/reports/pdf";
import { buildDailyXlsx } from "@/lib/reports/xlsx";
import { buildDailyCsv } from "@/lib/reports/csv";
import { sendReportEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow generation time on Vercel

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // if unset, allow (dev)
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // manual test via ?token=
  const url = new URL(req.url);
  if (url.searchParams.get("token") === secret) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || istToday();

  // start a job log row
  const job = await prisma.reportJob.create({
    data: { reportDate: date, scheduledFor: process.env.REPORT_TIME || "18:00 IST", status: "RUNNING" },
  });

  try {
    const { rows, summary } = await getDailyReport(date);

    if (summary.total === 0) {
      // NO-DATA DAY: send a clear email, no attachments
      await sendReportEmail({
        subject: `Freezer PDI Daily Report - ${date}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#0f172a">
            <h2 style="color:#0b1a40;margin:0 0 6px">Freezer PDI Daily Report</h2>
            <p style="color:#64748b;margin:0 0 16px">Report Date: <b>${date}</b></p>
            <p><b>No completed PDI test data is available for this date.</b></p>
            <p style="color:#64748b;font-size:13px">No freezers were tested (completed) on ${date}.</p>
          </div>`,
      });
      await prisma.reportJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", completedAt: new Date(), recordCount: 0 },
      });
      return Response.json({ ok: true, date, records: 0, message: "no-data email sent" });
    }

    // build the three files
    const pdf = await buildDailyPdf(date, rows, summary);
    const xlsx = buildDailyXlsx(date, rows, summary);
    const csv = buildDailyCsv(date, rows, summary);
    const base = `Freezer_PDI_Report_${date}`;

    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a">
        <h2 style="color:#0b1a40;margin:0 0 6px">Freezer PDI Daily Report</h2>
        <p style="color:#64748b;margin:0 0 16px">Report Date: <b>${date}</b></p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px">Total Tested</td><td style="padding:4px 12px"><b>${summary.total}</b></td></tr>
          <tr><td style="padding:4px 12px;color:#16a34a">Passed</td><td style="padding:4px 12px;color:#16a34a"><b>${summary.passed}</b></td></tr>
          <tr><td style="padding:4px 12px;color:#dc2626">Failed</td><td style="padding:4px 12px;color:#dc2626"><b>${summary.failed}</b></td></tr>
          <tr><td style="padding:4px 12px">Pass %</td><td style="padding:4px 12px"><b>${summary.passPct}%</b></td></tr>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:16px">Detailed PDF, Excel and CSV reports are attached.</p>
      </div>`;

    await sendReportEmail({
      subject: `Freezer PDI Daily Report - ${date}`,
      html,
      attachments: [
        { filename: `${base}.pdf`, content: pdf, contentType: "application/pdf" },
        { filename: `${base}.xlsx`, content: xlsx, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        { filename: `${base}.csv`, content: csv, contentType: "text/csv" },
      ],
    });

    await prisma.reportJob.update({
      where: { id: job.id },
      data: { status: "SUCCESS", completedAt: new Date(), recordCount: summary.total },
    });
    return Response.json({ ok: true, date, records: summary.total, message: "report emailed" });
  } catch (e: any) {
    console.error("[PDI] daily report error:", e);
    await prisma.reportJob.update({
      where: { id: job.id },
      data: { status: "FAILED", completedAt: new Date(), errorMessage: String(e?.message ?? e).slice(0, 500) },
    });
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 500 });
  }
}
