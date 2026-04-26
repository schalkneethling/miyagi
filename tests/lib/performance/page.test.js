import { describe, expect, test } from "vitest";
import { computePageTotals } from "../../../lib/performance/page.js";

function makeComponentMeasurement(componentPath, cssBytes, jsBytes) {
  return {
    componentPath,
    css: { path: `${componentPath}/x.css`, bytes: cssBytes, budget: null, status: "unbudgeted" },
    js: { path: `${componentPath}/x.js`, bytes: jsBytes, budget: null, status: "unbudgeted" },
  };
}

describe("computePageTotals", () => {
  test("sums css and js across listed components and exposes html bytes", () => {
    const result = computePageTotals({
      variationConfig: {
        components: ["components/atoms/button", "components/molecules/card"],
      },
      componentMeasurements: new Map([
        ["components/atoms/button", makeComponentMeasurement("components/atoms/button", 1000, 2000)],
        ["components/molecules/card", makeComponentMeasurement("components/molecules/card", 500, 800)],
      ]),
      htmlBytes: 4000,
      warnRatio: 0.8,
    });

    expect(result.css.bytes).toBe(1500);
    expect(result.js.bytes).toBe(2800);
    expect(result.html.bytes).toBe(4000);
    expect(result.total.bytes).toBe(8300);
  });

  test("status is 'unbudgeted' for keys without a budget", () => {
    const result = computePageTotals({
      variationConfig: {
        components: ["components/atoms/button"],
      },
      componentMeasurements: new Map([
        ["components/atoms/button", makeComponentMeasurement("components/atoms/button", 1000, 2000)],
      ]),
      htmlBytes: 1000,
      warnRatio: 0.8,
    });

    expect(result.css.status).toBe("unbudgeted");
    expect(result.js.status).toBe("unbudgeted");
    expect(result.html.status).toBe("unbudgeted");
    expect(result.total.status).toBe("unbudgeted");
  });

  test("evaluates each budget key independently", () => {
    const result = computePageTotals({
      variationConfig: {
        components: ["components/atoms/button"],
        budget: {
          css: "1 kB", // 1000B, bytes 1000 -> at 100%, exceed (>budget? no, ==)
          js: "1 kB", // bytes 2000 -> exceed
          html: "10 kB", // bytes 1000, ok
        },
      },
      componentMeasurements: new Map([
        ["components/atoms/button", makeComponentMeasurement("components/atoms/button", 1000, 2000)],
      ]),
      htmlBytes: 1000,
      warnRatio: 0.8,
    });

    // css: 1000 == 1000 -> bytes (>= warnRatio*budget=800) -> warn (since not > budget)
    expect(result.css.status).toBe("warn");
    expect(result.js.status).toBe("exceed");
    expect(result.html.status).toBe("ok");
    expect(result.total.status).toBe("unbudgeted");
  });

  test("evaluates total budget independently of per-key budgets", () => {
    const result = computePageTotals({
      variationConfig: {
        components: ["components/atoms/button"],
        budget: { total: "5 kB" },
      },
      componentMeasurements: new Map([
        ["components/atoms/button", makeComponentMeasurement("components/atoms/button", 1000, 2000)],
      ]),
      htmlBytes: 1000,
      warnRatio: 0.8,
    });

    expect(result.total.bytes).toBe(4000);
    expect(result.total.budget).toBe(5000);
    expect(result.total.status).toBe("warn");
    expect(result.css.status).toBe("unbudgeted");
  });

  test("returns errors[] for components missing from the measurements map", () => {
    const result = computePageTotals({
      variationConfig: {
        components: ["components/atoms/button", "components/unknown"],
      },
      componentMeasurements: new Map([
        ["components/atoms/button", makeComponentMeasurement("components/atoms/button", 100, 200)],
      ]),
      htmlBytes: 0,
      warnRatio: 0.8,
    });

    expect(result.errors).toEqual([
      { componentPath: "components/unknown", reason: "not measured" },
    ]);
    // sums still computed for the components that are known
    expect(result.css.bytes).toBe(100);
    expect(result.js.bytes).toBe(200);
  });
});
