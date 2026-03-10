import { describe, test, expect, beforeEach, afterEach } from "vitest";
import resolveAssets from "../../../../lib/render/helpers/resolve-assets.js";

describe("resolveAssets", () => {
  beforeEach(() => {
    global.config = {
      assets: {
        css: ["shared.css", "global-only.css"],
        js: [
          { src: "shared.js", position: "head" },
          { src: "global-only.js", position: "body" },
        ],
        shared: {
          css: ["shared.css"],
          js: [{ src: "shared.js", position: "head" }],
        },
        isolateComponents: false,
      },
    };
  });

  afterEach(() => {
    delete global.config;
  });

  describe("when component has $assets", () => {
    test("returns shared + $assets CSS", () => {
      const componentAssets = {
        css: ["button.css"],
        js: [],
      };
      const result = resolveAssets(componentAssets);
      expect(result.cssFiles).toStrictEqual(["shared.css", "button.css"]);
    });

    test("returns shared + $assets JS split by position", () => {
      const componentAssets = {
        css: [],
        js: [
          { src: "button.js", type: "module", position: "head" },
          { src: "analytics.js", position: "body" },
        ],
      };
      const result = resolveAssets(componentAssets);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
        { src: "button.js", type: "module", position: "head" },
      ]);
      expect(result.jsFilesBody).toStrictEqual([
        { src: "analytics.js", position: "body" },
      ]);
    });

    test("does NOT include global-only assets", () => {
      const componentAssets = {
        css: ["button.css"],
        js: [{ src: "button.js" }],
      };
      const result = resolveAssets(componentAssets);
      expect(result.cssFiles).not.toContain("global-only.css");
      expect(
        result.jsFilesHead
          .concat(result.jsFilesBody)
          .some((f) => f.src === "global-only.js"),
      ).toBe(false);
    });

    test("with empty $assets arrays returns only shared", () => {
      const componentAssets = { css: [], js: [] };
      const result = resolveAssets(componentAssets);
      expect(result.cssFiles).toStrictEqual(["shared.css"]);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
      ]);
      expect(result.jsFilesBody).toStrictEqual([]);
    });

    test("with only CSS key, defaults JS to shared", () => {
      const componentAssets = { css: ["button.css"] };
      const result = resolveAssets(componentAssets);
      expect(result.cssFiles).toStrictEqual(["shared.css", "button.css"]);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
      ]);
    });

    test("with only JS key, defaults CSS to shared", () => {
      const componentAssets = {
        js: [{ src: "button.js", position: "head" }],
      };
      const result = resolveAssets(componentAssets);
      expect(result.cssFiles).toStrictEqual(["shared.css"]);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
        { src: "button.js", position: "head" },
      ]);
    });
  });

  describe("when no $assets and isolateComponents is true", () => {
    beforeEach(() => {
      global.config.assets.isolateComponents = true;
    });

    test("returns only shared CSS", () => {
      const result = resolveAssets(null);
      expect(result.cssFiles).toStrictEqual(["shared.css"]);
    });

    test("returns only shared JS", () => {
      const result = resolveAssets(null);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
      ]);
      expect(result.jsFilesBody).toStrictEqual([]);
    });

    test("does NOT include global-only assets", () => {
      const result = resolveAssets(null);
      expect(result.cssFiles).not.toContain("global-only.css");
    });

    test("also works with undefined argument", () => {
      const result = resolveAssets(undefined);
      expect(result.cssFiles).toStrictEqual(["shared.css"]);
    });
  });

  describe("when no $assets and isolateComponents is false (legacy)", () => {
    test("returns all global CSS", () => {
      const result = resolveAssets(null);
      expect(result.cssFiles).toStrictEqual(["shared.css", "global-only.css"]);
    });

    test("returns all global JS split by position", () => {
      const result = resolveAssets(null);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
      ]);
      expect(result.jsFilesBody).toStrictEqual([
        { src: "global-only.js", position: "body" },
      ]);
    });
  });

  describe("edge cases", () => {
    test("empty shared + $assets returns only $assets", () => {
      global.config.assets.shared = { css: [], js: [] };
      const componentAssets = {
        css: ["button.css"],
        js: [{ src: "button.js", position: "head" }],
      };
      const result = resolveAssets(componentAssets);
      expect(result.cssFiles).toStrictEqual(["button.css"]);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "button.js", position: "head" },
      ]);
    });

    test("JS entries without position default to head", () => {
      const componentAssets = {
        css: [],
        js: [{ src: "button.js" }],
      };
      const result = resolveAssets(componentAssets);
      expect(result.jsFilesHead).toStrictEqual([
        { src: "shared.js", position: "head" },
        { src: "button.js" },
      ]);
      expect(result.jsFilesBody).toStrictEqual([]);
    });
  });
});
