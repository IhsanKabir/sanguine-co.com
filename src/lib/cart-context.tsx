"use client";

import { createContext, useContext, useEffect, useReducer, useCallback, useMemo, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  sku: string;
  name: string;
  priceBdt: number;
  cat: string;
  qty: number;
  color?: string | null;
  size?: string | null;
};

export type AppliedCoupon = {
  code: string;
  description: string | null;
  discountBdt: number;
  freeShipping: boolean;
};

type State = {
  items: CartItem[];
  saved: CartItem[];                       // save-for-later list
  open: boolean;
  hydrated: boolean;
  coupon: AppliedCoupon | null;
};

type Action =
  | { type: "HYDRATE"; items: CartItem[]; saved: CartItem[]; coupon: AppliedCoupon | null }
  | { type: "ADD"; item: CartItem }
  | { type: "INC"; key: string }
  | { type: "DEC"; key: string }
  | { type: "REMOVE"; key: string }
  | { type: "CLEAR" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_COUPON"; coupon: AppliedCoupon | null }
  | { type: "SAVE_FOR_LATER"; key: string }
  | { type: "MOVE_TO_CART"; key: string }
  | { type: "REMOVE_SAVED"; key: string };

const ITEMS_KEY = "ssg-cart-v1";
const SAVED_KEY = "ssg-saved-v1";
const COUPON_KEY = "ssg-coupon-v1";
const itemKey = (i: { productId: string; color?: string | null; size?: string | null }) =>
  `${i.productId}::${i.color ?? ""}::${i.size ?? ""}`;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE": return { ...state, items: action.items, saved: action.saved, coupon: action.coupon, hydrated: true };
    case "ADD": {
      const k = itemKey(action.item);
      const existing = state.items.findIndex((x) => itemKey(x) === k);
      const next = [...state.items];
      if (existing >= 0) next[existing] = { ...next[existing], qty: next[existing].qty + action.item.qty };
      else next.push(action.item);
      // If this item was saved-for-later, remove it from the saved list now.
      const saved = state.saved.filter((x) => itemKey(x) !== k);
      return { ...state, items: next, saved, open: true };
    }
    case "INC": return { ...state, items: state.items.map((x) => itemKey(x) === action.key ? { ...x, qty: x.qty + 1 } : x) };
    case "DEC": return { ...state, items: state.items.map((x) => itemKey(x) === action.key ? { ...x, qty: Math.max(1, x.qty - 1) } : x) };
    case "REMOVE": return { ...state, items: state.items.filter((x) => itemKey(x) !== action.key) };
    case "CLEAR":  return { ...state, items: [], coupon: null };
    case "OPEN":   return { ...state, open: true };
    case "CLOSE":  return { ...state, open: false };
    case "SET_COUPON": return { ...state, coupon: action.coupon };
    case "SAVE_FOR_LATER": {
      const item = state.items.find((x) => itemKey(x) === action.key);
      if (!item) return state;
      // Dedupe by key so re-saving doesn't duplicate.
      const saved = [{ ...item, qty: 1 }, ...state.saved.filter((x) => itemKey(x) !== action.key)];
      const items = state.items.filter((x) => itemKey(x) !== action.key);
      return { ...state, items, saved };
    }
    case "MOVE_TO_CART": {
      const item = state.saved.find((x) => itemKey(x) === action.key);
      if (!item) return state;
      const k = itemKey(item);
      const existing = state.items.findIndex((x) => itemKey(x) === k);
      const items = [...state.items];
      if (existing >= 0) items[existing] = { ...items[existing], qty: items[existing].qty + item.qty };
      else items.push(item);
      const saved = state.saved.filter((x) => itemKey(x) !== action.key);
      return { ...state, items, saved };
    }
    case "REMOVE_SAVED": return { ...state, saved: state.saved.filter((x) => itemKey(x) !== action.key) };
    default: return state;
  }
}

type CartCtx = {
  items: CartItem[];
  saved: CartItem[];
  open: boolean;
  hydrated: boolean;
  count: number;
  subtotalBdt: number;
  coupon: AppliedCoupon | null;
  add: (item: CartItem) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  saveForLater: (key: string) => void;
  moveToCart: (key: string) => void;
  removeSaved: (key: string) => void;
  itemKey: typeof itemKey;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], saved: [], open: false, hydrated: false, coupon: null });

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    let items: CartItem[] = [];
    let saved: CartItem[] = [];
    let coupon: AppliedCoupon | null = null;
    try {
      const raw = localStorage.getItem(ITEMS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      items = Array.isArray(parsed) ? parsed : [];
    } catch {}
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      saved = Array.isArray(parsed) ? parsed : [];
    } catch {}
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      coupon = raw ? JSON.parse(raw) : null;
    } catch {}
    dispatch({ type: "HYDRATE", items, saved, coupon });
  }, []);

  // Persist on changes.
  useEffect(() => {
    if (!state.hydrated) return;
    try { localStorage.setItem(ITEMS_KEY, JSON.stringify(state.items)); } catch {}
  }, [state.items, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved)); } catch {}
  }, [state.saved, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      if (state.coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(state.coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [state.coupon, state.hydrated]);

  const add        = useCallback((item: CartItem) => dispatch({ type: "ADD", item }), []);
  const inc        = useCallback((key: string) => dispatch({ type: "INC", key }), []);
  const dec        = useCallback((key: string) => dispatch({ type: "DEC", key }), []);
  const remove     = useCallback((key: string) => dispatch({ type: "REMOVE", key }), []);
  const clear      = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const openDrawer = useCallback(() => dispatch({ type: "OPEN" }), []);
  const closeDrawer= useCallback(() => dispatch({ type: "CLOSE" }), []);
  const setCoupon  = useCallback((coupon: State["coupon"]) => dispatch({ type: "SET_COUPON", coupon }), []);
  const saveForLater = useCallback((key: string) => dispatch({ type: "SAVE_FOR_LATER", key }), []);
  const moveToCart   = useCallback((key: string) => dispatch({ type: "MOVE_TO_CART", key }), []);
  const removeSaved  = useCallback((key: string) => dispatch({ type: "REMOVE_SAVED", key }), []);

  const count = useMemo(() => state.items.reduce((s, i) => s + i.qty, 0), [state.items]);
  const subtotalBdt = useMemo(() => state.items.reduce((s, i) => s + i.priceBdt * i.qty, 0), [state.items]);

  const value = useMemo<CartCtx>(
    () => ({
      items: state.items, saved: state.saved, open: state.open,
      hydrated: state.hydrated, coupon: state.coupon,
      count, subtotalBdt,
      add, inc, dec, remove, clear, openDrawer, closeDrawer,
      setCoupon, saveForLater, moveToCart, removeSaved, itemKey,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.items, state.saved, state.open, state.hydrated, state.coupon, count, subtotalBdt],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
