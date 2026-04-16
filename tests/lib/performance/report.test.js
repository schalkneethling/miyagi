import { describe, expect, test } from "vitest";
import { generatePerformanceReport } from "../../../lib/performance/report.js";

describe("generatePerformanceReport", () => {
  test("renders a summary, evaluation table, and per-category breakdown", () => {
    const result = {
      measurement: {
        categories: {
          "global-css": {
            files: [
              { path: "/project/a.css", raw: 10000, gzip: 3000, brotli: 2500 },
            ],
            totals: { raw: 10000, gzip: 3000, brotli: 2500 },
          },
          "global-js": {
            files: [],
            totals: { raw: 0, gzip: 0, brotli: 0 },
          },
        },
        totals: { raw: 10000, gzip: 3000, brotli: 2500 },
      },
      evaluations: [
        {
          category: "global-css",
          key: "total",
          label: "Global CSS",
          actual: 3000,
          budget: 35000,
          status: "ok",
          ratio: 0.08,
        },
        {
          category: "global-js",
          key: "total",
          label: "Global JS",
          actual: 0,
          budget: 200000,
          status: "ok",
          ratio: 0,
        },
      ],
      compression: "gzip",
      summary: { ok: 2, warn: 0, exceed: 0, unbudgeted: 0 },
    };

    const md = generatePerformanceReport(result, { cwd: "/project" });

    expect(md).toContain("# Performance Budget Report");
    expect(md).toContain("**Compression:** Gzip");
    expect(md).toContain("**OK:** 2");
    expect(md).toContain("| global-css | Total | 3.00 kB | 35.00 kB | OK |");
    expect(md).toContain("## global-css");
    expect(md).toContain("| a.css | 10.00 kB | 3.00 kB | 2.50 kB |");
    // Categories with no files should not generate a detail section.
    expect(md).not.toContain("## global-js");
  });
});
