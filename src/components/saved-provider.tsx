"use client";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
const SavedContext = createContext<{
  ids: Set<string>;
  ready: boolean;
  setSaved: (id: string, saved: boolean) => void;
}>({ ids: new Set(), ready: false, setSaved: () => {} });
export function SavedProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/me/saved")
      .then(async (r) => (r.ok ? r.json() : { saved: [] }))
      .then((data) => {
        if (active) {
          setIds(
            new Set(data.saved.map((s: { offerId: string }) => s.offerId)),
          );
          setReady(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);
  return (
    <SavedContext.Provider
      value={{
        ids,
        ready,
        setSaved: (id, saved) =>
          setIds((prev) => {
            const next = new Set(prev);
            if (saved) next.add(id);
            else next.delete(id);
            return next;
          }),
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}
export const useSaved = () => useContext(SavedContext);
