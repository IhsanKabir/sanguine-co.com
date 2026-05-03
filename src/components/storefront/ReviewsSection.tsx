"use client";

import { useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import { submitReview } from "@/lib/actions/reviews";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: Date;
  helpfulCount: number;
  photoUrls: string[] | null;
};

type Props = {
  productId: string;
  reviews: Review[];
  /** True if the current visitor has a delivered order containing this product and has not yet reviewed it. */
  canWrite: boolean;
  /** True if the visitor is signed in but ineligible (no delivered order, OR already reviewed). */
  signedInButIneligible: boolean;
  signInHref: string;
};

const Stars = ({ n }: { n: number }) => (
  <span aria-label={`${n} of 5 stars`} style={{ letterSpacing: "0.05em", color: "var(--gold-deep)" }}>
    {"★★★★★".slice(0, n)}
    <span style={{ color: "var(--line)" }}>{"★★★★★".slice(0, 5 - n)}</span>
  </span>
);

export default function ReviewsSection({ productId, reviews, canWrite, signedInButIneligible, signInHref }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)" }}>NOTES FROM CUSTOMERS</div>
          <h2 className="serif" style={{ fontSize: 32, margin: "8px 0 0", color: "var(--purple-900)", fontWeight: 400 }}>
            {reviews.length === 0 ? "Be the first to write a note." : `${reviews.length} note${reviews.length === 1 ? "" : "s"}.`}
          </h2>
        </div>
        {canWrite && !showForm && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>
            Write a note
          </button>
        )}
      </div>

      {showForm && canWrite && (
        <ReviewForm productId={productId} onClose={() => setShowForm(false)} />
      )}

      {!canWrite && !signedInButIneligible && (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 24px" }}>
          Reviews are written by customers who have received the piece.{" "}
          <a href={signInHref} style={{ color: "var(--purple-900)" }}>Sign in</a> if you have an order with us.
        </p>
      )}

      {reviews.length === 0 ? null : (
        <div style={{ display: "grid", gap: 18 }}>
          {reviews.map((r) => (
            <article key={r.id} style={{ padding: 20, background: "#fcfaf6", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Stars n={r.rating} />
                <time style={{ fontSize: 11, color: "var(--ink-soft)", fontFamily: "var(--mono)" }}>
                  {new Date(r.createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}
                </time>
              </div>
              {r.title && (
                <h3 className="serif" style={{ fontSize: 18, margin: "4px 0 6px", color: "var(--purple-900)", fontWeight: 500 }}>
                  {r.title}
                </h3>
              )}
              {r.body && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)", margin: 0, whiteSpace: "pre-wrap" }}>
                  {r.body}
                </p>
              )}
              {r.photoUrls && r.photoUrls.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {r.photoUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", width: 72, height: 72, flexShrink: 0, overflow: "hidden", border: "1px solid var(--line)", borderRadius: 2 }}>
                      <Image
                        src={url}
                        alt={`Customer photo ${i + 1}`}
                        width={72}
                        height={72}
                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewForm({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitReview({
        productId,
        rating,
        title: title.trim() || null,
        body: body.trim(),
      });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  };

  if (done) {
    return (
      <div style={{ padding: 20, marginBottom: 24, background: "#f9f4ec", border: "1px solid var(--gold-deep)" }}>
        <h3 className="serif" style={{ fontSize: 22, color: "var(--purple-900)", margin: 0 }}>Received with thanks.</h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.6 }}>
          The maison reads every note. Once approved it will appear here for other customers.
        </p>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: 24, padding: 20, background: "#fcfaf6", border: "1px solid var(--line)" }}>
      <h3 className="serif" style={{ fontSize: 20, margin: "0 0 12px", color: "var(--purple-900)", fontWeight: 500 }}>
        Write a note about this piece
      </h3>

      <div className="field">
        <label>Your rating</label>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 24, color: n <= rating ? "var(--gold-deep)" : "var(--line)", padding: 0 }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="A line that captures it" />
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Your note</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Tell us about the fit, the feel, the way it arrives. Specifics help."
          style={{ width: "100%", padding: 10, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, border: "1px solid var(--line)", background: "white", resize: "vertical" }}
        />
        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>{body.length} / 2000</div>
      </div>

      {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Sending…" : "Submit note"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>
          Cancel
        </button>
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 12 }}>
        Notes are reviewed by the maison before they appear publicly. We do not edit content; we only decline notes that are abusive or off-topic.
      </p>
    </form>
  );
}
