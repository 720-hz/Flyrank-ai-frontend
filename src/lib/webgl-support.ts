/**
 * Synchronous WebGL feature detection. No side effects beyond creating a throwaway
 * `<canvas>` element — safe to call from an effect, not safe to call during SSR (there's no
 * `document`), so callers gate it behind a client-only check (see AgentCore's "unknown until
 * mounted" state).
 *
 * `getContext` can both return `null` (no WebGL) and throw (some locked-down/headless
 * environments throw instead of returning null for "webgl2"), so both are treated the same.
 */
export function detectWebglSupport(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
