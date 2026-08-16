/**
 * Dev-only console logging, so hot paths (app boot, PWA install
 * detection) don't spam the console for every user in production.
 * Errors should keep using console.error directly — those stay
 * visible in production to debug real user issues (see
 * src/lib/realtimeLogger.ts, which follows the same convention).
 */
export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
