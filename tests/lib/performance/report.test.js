import { describe, expect, test } from "vitest";
import { generatePerformanceReport } from "../../../lib/performance/report.js";

describe("generatePerformanceReport", () => {
  const baseResult = {
    enabled: true,
    compression: "gzip",
    warnRatio: 0.8,
    components: [
      {
        componentPath: "components/atoms/button",
        css: { path: "/x", bytes: 1234, budget: 5000, status: "ok" },
        js: { path: "/y", bytes: 800, budget: 10000, status: "ok" },
      },
    ],
    pages: [
      {
        templatePath: "templates/default",
        variation: "home",
        totals: {
          css: { bytes: 1234, budget: null, status: "unbudgeted" },
          js: { bytes: 800, budget: null, status: "unbudgeted" },
          html: { bytes: 4000, budget: 30000, status: "ok" },
          total: { bytes: 6034, budget: 150000, status: "ok" },
          errors: [],
        },
      },
    ],
    summary: {
      components: { ok: 1, warn: 0, exceed: 0, unbudgeted: 0, missing: 0 },
      pages: { ok: 1, warn: 0, exceed: 0, unbudgeted: 0 },
    },
  };

  test("includes a Components section listing each component", () => {
    const md = generatePerformanceReport(baseResult);
    expect(md).toContain("# Performance report");
    expect(md).toContain("## Components");
    expect(md).toContain("components/atoms/button");
  });

  test("includes a Pages section listing each variation with all four metrics", () => {
    const md = generatePerformanceReport(baseResult);
    expect(md).toContain("## Pages");
    expect(md).toContain("templates/default");
    expect(md).toContain("home");
    // headers for the four metrics
    expect(md).toMatch(/CSS/i);
    expect(md).toMatch(/HTML/i);
    expect(md).toMatch(/Total/i);
  });

  test("omits Components section when no components are configured", () => {
    const md = generatePerformanceReport({
      ...baseResult,
      components: [],
      summary: {
        ...baseResult.summary,
        components: { ok: 0, warn: 0, exceed: 0, unbudgeted: 0, missing: 0 },
      },
    });
    expect(md).not.toContain("## Components");
  });

  test("omits Pages section when no pages are configured", () => {
    const md = generatePerformanceReport({
      ...baseResult,
      pages: [],
      summary: {
        ...baseResult.summary,
        pages: { ok: 0, warn: 0, exceed: 0, unbudgeted: 0 },
      },
    });
    expect(md).not.toContain("## Pages");
  });

  test("renders compression and warnRatio in the header", () => {
    const md = generatePerformanceReport(baseResult);
    expect(md).toMatch(/compression.*gzip/i);
    expect(md).toMatch(/warn ratio.*0\.8/i);
  });
});
