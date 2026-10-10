"use client";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
const SavedContext = createContext<{
  ids: Set<string>;
  ready: boolean;
  setSaved: (id: string, saved: boolean) => void;
}>({ ids: new Set(), ready: false, setSaved: () => {} });
export function SavedProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const revision = useRef(0);
  const [reconcile, setReconcile] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const readRevision = revision.current;
    fetch("/api/me/saved", { signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) return { saved: [] };
        if (!r.ok) throw new Error("Could not load saved deals.");
        return r.json();
      })
      .then((data) => {
        if (active && revision.current === readRevision) {
          setIds(
            new Set(data.saved.map((s: { offerId: string }) => s.offerId)),
          );
          setReady(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, [pathname, reconcile]);
  return (
    <SavedContext.Provider
      value={{
        ids,
        ready,
        setSaved: (id, saved) => {
          // Invalidate older reads before React schedules the reconciliation.
          revision.current += 1;
          setIds((prev) => {
            const next = new Set(prev);
            if (saved) next.add(id);
            else next.delete(id);
            return next;
          });
          setReady(true);
          setReconcile((value) => value + 1);
        },
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}
export const useSaved = () => useContext(SavedContext);
