import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncCourierStatuses } from "@/lib/shipping/sync";
import { captureError } from "@/lib/monitoring";

/**
 * Daily courier status sync (schedule in vercel.json). Vercel Cron calls this
 * with `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET set the route
 * refuses every call, so it can never be triggered by a stranger; the admin's
 * "Sync courier status" button runs the same job without it.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const summary = await syncCourierStatuses();
    return NextResponse.json(summary);
  } catch (e) {
    captureError(e, { where: "cron/courier-sync" });
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
