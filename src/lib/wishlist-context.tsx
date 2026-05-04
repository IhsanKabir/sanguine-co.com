"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";

const KEY = "ssg-wish-v1";

type Ctx = {
  items: Set<string>;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  hydrated: boolean;
};

const C = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      setItems(new Set(Array.isArray(arr) ? arr : []));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify([...items])); } catch {}
  }, [items, hydrated]);

  const toggle = useCallback((id: string) => {
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => items.has(id), [items]);

  const ctxValue = useMemo(
    () => ({ items, toggle, has, hydrated }),
    [items, toggle, has, hydrated],
  );
  return <C.Provider value={ctxValue}>{children}</C.Provider>;
}

export function useWishlist() {
  const v = useContext(C);
  if (!v) throw new Error("useWishlist must be used inside WishlistProvider");
  return v;
}
