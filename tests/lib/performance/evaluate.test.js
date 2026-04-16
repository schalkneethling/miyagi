import { describe, expect, test } from "vitest";
import { evaluate, summarise } from "../../../lib/performance/index.js";

/**
 * @param {Record<string, {raw: number, gzip: number, brotli: number}>} byCat
 * @returns {import("../../../lib/performance/measure.js").Measurement}
 */
function fakeMeasurement(byCat) {
  const categories = {};
  const totals = { raw: 0, gzip: 0, brotli: 0 };
  for (const [cat, t] of Object.entries(byCat)) {
    categories[cat] = { files: [], totals: t };
    totals.raw += t.raw;
    totals.gzip += t.gzip;
    totals.brotli += t.brotli;
  }
  return { categories, totals };
}

describe("evaluate", () => {
  test("classifies ok / warn / exceed correctly at boundaries", () => {
    const measurement = fakeMeasurement({
      "global-css": { raw: 0, gzip: 34999, brotli: 0 },
      "global-js": { raw: 0, gzip: 160001, brotli: 0 },
    });

    const rows = evaluate(
      measurement,
      {
        global: { css: "35 kB", js: "200 kB" },
      },
      "gzip",
    );

    const cssRow = rows.find((r) => r.category === "global-css");
    const jsRow = rows.find((r) => r.category === "global-js");

    // 34999 / 35000 = 0.99+ → warn (>= 80%)
    expect(cssRow.status).toBe("warn");
    // 160001 / 200000 = 0.80+ → warn
    expect(jsRow.status).toBe("warn");
  });

  test("flags exceed when over budget", () => {
    const measurement = fakeMeasurement({
      "global-css": { raw: 0, gzip: 50000, brotli: 0 },
      "global-js": { raw: 0, gzip: 10, brotli: 0 },
    });

    const rows = evaluate(
      measurement,
      { global: { css: "35 kB", js: "200 kB" } },
      "gzip",
    );

    expect(rows.find((r) => r.category === "global-css").status).toBe("exceed");
    expect(rows.find((r) => r.category === "global-js").status).toBe("ok");
  });

  test("marks categories without a budget as unbudgeted", () => {
    const measurement = fakeMeasurement({
      "global-css": { raw: 0, gzip: 1, brotli: 0 },
      "global-js": { raw: 0, gzip: 1, brotli: 0 },
    });

    const rows = evaluate(measurement, {}, "gzip");
    for (const row of rows) {
      expect(row.status).toBe("unbudgeted");
      expect(row.budget).toBe(null);
    }
  });

  test("respects selected compression metric", () => {
    const measurement = fakeMeasurement({
      "global-css": { raw: 100000, gzip: 30000, brotli: 25000 },
      "global-js": { raw: 0, gzip: 0, brotli: 0 },
    });

    const gzipRows = evaluate(measurement, { global: { css: "35 kB" } }, "gzip");
    const rawRows = evaluate(measurement, { global: { css: "35 kB" } }, "raw");

    expect(gzipRows.find((r) => r.category === "global-css").status).toBe(
      "warn",
    );
    expect(rawRows.find((r) => r.category === "global-css").status).toBe(
      "exceed",
    );
  });

  test("evaluates folder budgets and per-page HTML, filtering passing pages by default", () => {
    const measurement = {
      categories: {
        "global-css": { files: [], totals: { raw: 0, gzip: 0, brotli: 0 } },
        "global-js": { files: [], totals: { raw: 0, gzip: 0, brotli: 0 } },
        "folder:fonts": {
          files: [],
          totals: { raw: 0, gzip: 40000, brotli: 0 },
        },
        html: {
          files: [
            { path: "/b/a.html", raw: 0, gzip: 35000, brotli: 0 },
            { path: "/b/b.html", raw: 0, gzip: 10000, brotli: 0 },
          ],
          totals: { raw: 0, gzip: 45000, brotli: 0 },
        },
      },
      totals: { raw: 0, gzip: 85000, brotli: 0 },
    };

    const budgets = {
      folders: { fonts: { total: "30 kB" } },
      html: { perPage: "30 kB", total: "100 kB" },
    };

    const rows = evaluate(measurement, budgets, "gzip");

    expect(rows.find((r) => r.category === "folder:fonts").status).toBe(
      "exceed",
    );

    // a.html exceeds the 30 kB per-page budget — should be listed
    const aPage = rows.find((r) => r.key === "/b/a.html");
    expect(aPage.status).toBe("exceed");

    // b.html is within budget — should NOT appear by default
    const bPage = rows.find((r) => r.key === "/b/b.html");
    expect(bPage).toBeUndefined();

    // A summary row should note the passing page
    const pagesOk = rows.find((r) => r.key === "pages-ok");
    expect(pagesOk).toBeDefined();
    expect(pagesOk.label).toContain("1 of 2");

    const htmlTotal = rows.find(
      (r) => r.category === "html" && r.key === "total",
    );
    expect(htmlTotal.status).toBe("ok");
  });

  test("lists all HTML pages when listAllPages option is set", () => {
    const measurement = {
      categories: {
        "global-css": { files: [], totals: { raw: 0, gzip: 0, brotli: 0 } },
        "global-js": { files: [], totals: { raw: 0, gzip: 0, brotli: 0 } },
        html: {
          files: [
            { path: "/b/a.html", raw: 0, gzip: 35000, brotli: 0 },
            { path: "/b/b.html", raw: 0, gzip: 10000, brotli: 0 },
          ],
          totals: { raw: 0, gzip: 45000, brotli: 0 },
        },
      },
      totals: { raw: 0, gzip: 45000, brotli: 0 },
    };

    const rows = evaluate(
      measurement,
      { html: { perPage: "30 kB" } },
      "gzip",
      { label: {} },
      { listAllPages: true },
    );

    const aPage = rows.find((r) => r.key === "/b/a.html");
    const bPage = rows.find((r) => r.key === "/b/b.html");
    expect(aPage.status).toBe("exceed");
    expect(bPage.status).toBe("ok");

    // No summary row when all pages are shown
    expect(rows.find((r) => r.key === "pages-ok")).toBeUndefined();
  });
});

describe("summarise", () => {
  test("buckets statuses", () => {
    const summary = summarise([
      { status: "ok" },
      { status: "warn" },
      { status: "warn" },
      { status: "exceed" },
      { status: "unbudgeted" },
    ]);
    expect(summary).toEqual({ ok: 1, warn: 2, exceed: 1, unbudgeted: 1 });
  });
});
