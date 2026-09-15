/**
 * Navigation & render loop logger.
 *
 * Detects:
 *  - excessive route changes in a short window (navigation loop)
 *  - excessive re-renders of the same component (render loop)
 *  - prolonged or repeated "loading" states (loading loop)
 *
 * Activate by setting `localStorage.setItem("debug:nav", "1")` and reloading.
 * Logs are written via console.warn / console.error so they show up in
 * the standard browser devtools and in Lovable's preview console capture.
 */

const ENABLED_KEY = "debug:nav";

export function isNavLoggerEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

type Bucket = {
  count: number;
  windowStart: number;
  lastWarnAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Records an event under `key`. If more than `threshold` events happen
 * within `windowMs`, emits a single warning (rate-limited to once per
 * `cooldownMs`) describing the suspected loop.
 */
export function trackEvent(
  key: string,
  opts: {
    threshold?: number;
    windowMs?: number;
    cooldownMs?: number;
    detail?: unknown;
  } = {},
) {
  if (!isNavLoggerEnabled()) return;

  const {
    threshold = 10,
    windowMs = 2000,
    cooldownMs = 5000,
    detail,
  } = opts;

  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { count: 0, windowStart: now, lastWarnAt: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  if (bucket.count >= threshold && now - bucket.lastWarnAt > cooldownMs) {
    bucket.lastWarnAt = now;
    // eslint-disable-next-line no-console
    console.warn(
      `[nav-logger] possible loop on "${key}": ${bucket.count} events in ${windowMs}ms`,
      detail ?? "",
    );
  }
}

export function resetTracker(key?: string) {
  if (key) buckets.delete(key);
  else buckets.clear();
}
