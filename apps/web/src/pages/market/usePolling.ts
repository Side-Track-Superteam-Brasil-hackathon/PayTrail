import { useEffect, useRef } from 'react';

/** Runs `fn` immediately and then every `ms`, stopping on unmount. */
export function usePolling(fn: () => void | Promise<void>, ms: number, enabled = true): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const tick = () => {
      if (!stopped) void ref.current();
    };
    tick();
    const t = window.setInterval(tick, ms);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [ms, enabled]);
}
