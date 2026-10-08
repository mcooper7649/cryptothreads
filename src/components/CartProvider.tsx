"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  id: string; // stable key
  title: string;
  blankType: string;
  mode: string;
  query: string; // coin query used to (re)generate the print file at fulfillment
  style?: string; // print style id
  slogan?: string | null; // slogan id, for styles that print one
  size?: string;
  previewUrl: string; // data URI or stored preview
  priceCents: number;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  add: (item: Omit<CartItem, "id" | "qty"> & { id?: string; qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "cryptothreads.cart.v2"; // v2 added style + slogan

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const api = useMemo<CartCtx>(() => {
    const subtotalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
    return {
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotalCents,
      add: (item) =>
        setItems((prev) => {
          const id =
            item.id ??
            [item.query, item.blankType, item.mode, item.style, item.slogan, item.size].map((x) => x ?? "").join(":");
          const existing = prev.find((p) => p.id === id);
          if (existing) {
            return prev.map((p) =>
              p.id === id ? { ...p, qty: p.qty + (item.qty ?? 1) } : p
            );
          }
          return [...prev, { ...item, id, qty: item.qty ?? 1 }];
        }),
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      setQty: (id, qty) =>
        setItems((prev) =>
          prev
            .map((p) => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p))
            .filter((p) => p.qty > 0)
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
