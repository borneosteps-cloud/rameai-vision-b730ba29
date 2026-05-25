import { useEffect, useRef, useState } from "react";

/**
 * Like useState but persists to localStorage so values survive
 * client-side route changes / component unmounts.
 *
 * SSR-safe: reads from localStorage only after mount.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    } finally {
      hydrated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function clearPersistentKeys(prefix: string) {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(prefix)) toRemove.push(k);
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));
}
