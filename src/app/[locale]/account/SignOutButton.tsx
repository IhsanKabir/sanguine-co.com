"use client";

import { signOut } from "@/lib/actions/auth";
import { useState } from "react";

export default function SignOutButton() {
  const [hover, setHover] = useState(false);

  return (
    <form action={signOut}>
      <button
        type="submit"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: "transparent",
          border: "1px solid oklch(0.65 0.08 300 / 0.6)",
          color: "var(--cream)",
          fontSize: 11, letterSpacing: ".1em",
          textTransform: "uppercase", padding: "9px 20px",
          cursor: "pointer", fontFamily: "var(--sans)", transition: "opacity .15s",
          opacity: hover ? 1 : 0.75,
        }}
      >
        Sign out
      </button>
    </form>
  );
}
