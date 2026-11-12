import { after } from "next/server";
import { captureError } from "@/lib/monitoring";

/**
 * Run a task once the response has been sent, and keep the function alive
 * until it settles.
 *
 * Why this exists (Nov 2026): notification emails were started without being
 * awaited ("fire and forget"). On Vercel the function is frozen as soon as
 * the response goes out, so those sends never completed: Brevo recorded zero
 * emails in three months. `after()` hands the task to the platform, which
 * waits for it.
 *
 * Never throws. Outside a request scope (scripts, tests) `after()` is not
 * available, so the task simply runs straight away.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  const safe = async () => {
    try {
      await task();
    } catch (e) {
      captureError(e, { where: "runAfterResponse" });
    }
  };
  try {
    after(safe);
  } catch {
    void safe();
  }
}
