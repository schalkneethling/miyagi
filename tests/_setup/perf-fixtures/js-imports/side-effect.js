// Side-effect only — registers a global and exports nothing.
if (typeof globalThis !== "undefined") {
  globalThis.__MIYAGI_PERF_FIXTURE_LOADED__ = true;
}
