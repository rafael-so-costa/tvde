import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isNavLoggerEnabled, trackEvent } from "@/lib/navigationLogger";

/**
 * Mount once near the top of the tree. Logs every route change and warns
 * when the app navigates suspiciously fast (likely a redirect loop).
 *
 * Enable with: localStorage.setItem("debug:nav", "1"); location.reload();
 */
export function useNavigationLogger() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);
  const prevAt = useRef<number>(0);

  useEffect(() => {
    if (!isNavLoggerEnabled()) return;
    const now = performance.now();
    const dt = prevAt.current ? Math.round(now - prevAt.current) : 0;
    // eslint-disable-next-line no-console
    console.info(
      `[nav-logger] route -> ${location.pathname}${location.search}` +
        (prevPath.current ? ` (from ${prevPath.current}, +${dt}ms)` : ""),
    );
    trackEvent("route-change", {
      threshold: 8,
      windowMs: 2000,
      detail: { path: location.pathname },
    });
    prevPath.current = location.pathname + location.search;
    prevAt.current = now;
  }, [location.pathname, location.search]);
}

/**
 * Counts renders of the component it's used in and warns if it re-renders
 * an unreasonable number of times in a short window.
 */
export function useRenderLogger(name: string, threshold = 25) {
  const count = useRef(0);
  count.current += 1;
  useEffect(() => {
    if (!isNavLoggerEnabled()) return;
    trackEvent(`render:${name}`, {
      threshold,
      windowMs: 1000,
      detail: { renders: count.current },
    });
  });
}

/**
 * Tracks transitions of a boolean `loading` flag. Warns when loading
 * toggles too many times (loading loop) or stays true for too long.
 */
export function useLoadingLogger(name: string, loading: boolean) {
  const lastValue = useRef<boolean | null>(null);
  const becameTrueAt = useRef<number | null>(null);
  const stuckTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isNavLoggerEnabled()) return;

    if (lastValue.current !== loading) {
      lastValue.current = loading;
      if (loading) {
        becameTrueAt.current = performance.now();
        trackEvent(`loading-toggle:${name}`, {
          threshold: 6,
          windowMs: 3000,
          detail: { state: "on" },
        });
        if (stuckTimer.current) window.clearTimeout(stuckTimer.current);
        stuckTimer.current = window.setTimeout(() => {
          // eslint-disable-next-line no-console
          console.error(
            `[nav-logger] "${name}" has been loading for >8s — possible stuck loading state`,
          );
        }, 8000);
      } else {
        if (stuckTimer.current) {
          window.clearTimeout(stuckTimer.current);
          stuckTimer.current = null;
        }
        const dur = becameTrueAt.current
          ? Math.round(performance.now() - becameTrueAt.current)
          : 0;
        // eslint-disable-next-line no-console
        console.info(`[nav-logger] "${name}" loading resolved in ${dur}ms`);
      }
    }

    return () => {
      if (stuckTimer.current) {
        window.clearTimeout(stuckTimer.current);
        stuckTimer.current = null;
      }
    };
  }, [loading, name]);
}
