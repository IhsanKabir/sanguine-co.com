"use client";

import { useState, useTransition } from "react";
import Icon from "./Icon";
import { subscribeNewsletter } from "@/lib/actions/newsletter";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    startTransition(async () => {
      await subscribeNewsletter({ email });
      setSent(true);
      setEmail("");
    });
  };

  return (
    <>
      <form className="letters-form" onSubmit={onSubmit}>
        <input
          type="email"
          placeholder="your address, please"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Email address"
          disabled={pending || sent}
        />
        <button type="submit" disabled={pending || sent}>
          <Icon name="feather" size={14} /> {pending ? "Sending…" : "Subscribe"}
        </button>
      </form>
      <div className={"letters-thanks " + (sent ? "in" : "")} role="status" aria-live="polite">
        {sent && "Thank you — your first letter follows."}
      </div>
    </>
  );
}
