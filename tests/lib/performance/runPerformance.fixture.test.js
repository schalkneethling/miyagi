import { describe, expect, test, beforeEach } from "vitest";
import path from "node:path";
import { runPerformance } from "../../../lib/performance/index.js";
import { clearMeasureCache } from "../../../lib/performance/measure.js";

const FIXTURE_CWD = path.join(
  import.meta.dirname,
  "../../_setup/perf-fixtures/e2e-project",
);

beforeEach(() => clearMeasureCache());

describe("runPerformance against the e2e fixture project", () => {
  test("measures every configured component using realistic CSS/JS", async () => {
    const result = await runPerformance({ cwd: FIXTURE_CWD });

    expect(result.enabled).toBe(true);
    expect(result.components).toHaveLength(2);

    const button = result.components.find(
      (c) => c.componentPath === "components/button",
    );
    const card = result.components.find(
      (c) => c.componentPath === "components/card",
    );

    // Button has button.css (which @imports reset.css) and button.js
    // (which imports helpers/a11y.js). Both reachable trees should be
    // bigger than just the entry file.
    expect(button.css.bytes).toBeGreaterThan(500);
    expect(button.js.bytes).toBeGreaterThan(400);
    expect(button.css.status).toBe("ok");
    expect(button.js.status).toBe("ok");

    // Card has standalone CSS/JS — no imports.
    expect(card.css.bytes).toBeGreaterThan(200);
    expect(card.js.bytes).toBeGreaterThan(0);
  });

  test("page totals equal the sum of declared component bytes plus rendered HTML", async () => {
    const renderedHtml =
      "<!doctype html><html><body><main><h1>landing</h1></main></body></html>";
    const result = await runPerformance({
      cwd: FIXTURE_CWD,
      render: async () => renderedHtml,
    });

    expect(result.pages).toHaveLength(1);
    const page = result.pages[0];

    const button = result.components.find(
      (c) => c.componentPath === "components/button",
    );
    const card = result.components.find(
      (c) => c.componentPath === "components/card",
    );

    expect(page.totals.css.bytes).toBe(button.css.bytes + card.css.bytes);
    expect(page.totals.js.bytes).toBe(button.js.bytes + card.js.bytes);
    expect(page.totals.html.bytes).toBe(Buffer.byteLength(renderedHtml));
    expect(page.totals.total.bytes).toBe(
      page.totals.css.bytes +
        page.totals.js.bytes +
        page.totals.html.bytes,
    );
    expect(page.totals.total.status).toBe("ok");
  });

  test("summary tallies match the per-component / per-page statuses", async () => {
    const result = await runPerformance({
      cwd: FIXTURE_CWD,
      render: async () => "<html></html>",
    });

    const componentStatuses = result.components.flatMap((c) => [
      c.css.status,
      c.js.status,
    ]);
    expect(componentStatuses).toContain("ok");
    expect(componentStatuses).toContain("unbudgeted"); // card.js
    expect(result.summary.components.exceed).toBe(0);
    expect(result.summary.pages.exceed).toBe(0);
  });

  test("gzip compression reports smaller bytes than raw for the same fixture", async () => {
    const raw = await runPerformance({ cwd: FIXTURE_CWD, compression: "raw" });
    const gzip = await runPerformance({
      cwd: FIXTURE_CWD,
      compression: "gzip",
    });

    const rawTotal = raw.components.reduce(
      (acc, c) => acc + c.css.bytes + c.js.bytes,
      0,
    );
    const gzipTotal = gzip.components.reduce(
      (acc, c) => acc + c.css.bytes + c.js.bytes,
      0,
    );

    expect(gzipTotal).toBeGreaterThan(0);
    expect(gzipTotal).toBeLessThan(rawTotal);
  });
});
