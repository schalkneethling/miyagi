import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  getComponentData,
  getVariationData,
} from "../../../lib/mocks/index.js";
import init from "../../../lib/index.js";

beforeAll(() => (process.env.MIYAGI_JS_API = true));
afterAll(() => (process.env.MIYAGI_JS_API = false));

async function getRoute(component) {
  global.app = await init("api");
  return global.state.routes.find(
    (route) => route.paths.dir.short === component,
  );
}

describe("getComponentData $assets extraction", () => {
  describe("component with $assets in mocks", () => {
    test("each context entry has $assets from mock data", async () => {
      const route = await getRoute("isolated");
      const data = await getComponentData(route);

      expect(data).not.toBeNull();
      expect(data.length).toBeGreaterThan(0);

      for (const entry of data) {
        expect(entry.$assets).toStrictEqual({
          css: ["isolated.css"],
          js: [{ src: "isolated.js", type: "module" }],
        });
      }
    });

    test("$assets is not included in resolved template data", async () => {
      const route = await getRoute("isolated");
      const data = await getComponentData(route);

      for (const entry of data) {
        expect(entry.resolved).not.toHaveProperty("$assets");
        expect(entry.raw).not.toHaveProperty("$assets");
      }
    });

    test("$assets is consistent across all variants", async () => {
      const route = await getRoute("isolated");
      const data = await getComponentData(route);

      expect(data.length).toBe(2); // default + alt variant
      expect(data[0].$assets).toStrictEqual(data[1].$assets);
    });
  });

  describe("component without $assets in mocks", () => {
    test("context entries have null $assets", async () => {
      const route = await getRoute("button");
      const data = await getComponentData(route);

      expect(data).not.toBeNull();
      for (const entry of data) {
        expect(entry.$assets).toBeNull();
      }
    });
  });
});

describe("getVariationData $assets extraction", () => {
  test("returned variation entry includes $assets", async () => {
    const route = await getRoute("isolated");
    const data = await getVariationData(route, "alt");

    expect(data).not.toBeNull();
    expect(data.$assets).toStrictEqual({
      css: ["isolated.css"],
      js: [{ src: "isolated.js", type: "module" }],
    });
  });

  test("variation from component without $assets has null $assets", async () => {
    const route = await getRoute("button");
    const data = await getVariationData(route, "variant");

    expect(data).not.toBeNull();
    expect(data.$assets).toBeNull();
  });
});
