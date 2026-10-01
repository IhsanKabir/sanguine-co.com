"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncCourierStatusNow } from "@/lib/actions/admin";
import type { SyncSummary } from "@/lib/shipping/sync";

/**
 * Runs the courier status sync on demand. The same job runs once a day from
 * /api/cron/courier-sync; this is for "the customer says it arrived" moments
 * and for checking the courier credentials work.
 */
export default function CourierSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await syncCourierStatusNow();
        setResult(r);
        router.refresh();
      } catch {
        setError("Sync failed. Try again in a minute.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={run}
        disabled={pending}
        title="Ask Steadfast / Pathao for the status of every shipped order"
      >
        {pending ? "Syncing…" : "Sync courier status"}
      </button>
      {(result || error) && (
        <div className="courier-sync-result" role="status">
          {error ?? (result && <SummaryText r={result} />)}
          <button type="button" className="link" onClick={() => { setResult(null); setError(null); }} style={{ marginLeft: 10 }}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

function SummaryText({ r }: { r: SyncSummary }) {
  return (
    <div>
      <div>
        Checked {r.checked} shipped order{r.checked === 1 ? "" : "s"}
        {r.delivered.length > 0 ? ` · marked delivered: ${r.delivered.join(", ")}` : " · none newly delivered"}.
      </div>
      {r.attention.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <b>Needs you</b> (left as shipped, nothing restocked; cancel once the parcel is back):
          <ul style={{ margin: "4px 0 0 18px" }}>
            {r.attention.map((a) => <li key={a.number}>{a.number}: {a.courier} reports “{a.status}”</li>)}
          </ul>
        </div>
      )}
      {r.notConfigured.length > 0 && (
        <div style={{ marginTop: 6 }}>No credentials for: {r.notConfigured.join(", ")}. Its orders were skipped.</div>
      )}
      {r.errors.length > 0 && (
        <div style={{ marginTop: 6 }}>
          Could not check {r.errors.length}: {r.errors.slice(0, 5).map((e) => `${e.number} (${e.error})`).join("; ")}
        </div>
      )}
    </div>
  );
}
