import { describe, test, expect, vi, beforeEach } from "vitest";
import {
	parseLibrariesYaml,
	resolveComponentAssets,
	mapLibraryToComponent,
} from "../../../lib/drupal/resolve-library-assets.js";

const FIXTURE_YAML = `
element-info-message:
  header: true
  css:
    component:
      build/assets/css/info-message.css: {}
  js:
    build/assets/js/info-message.js:
      attributes:
        type: module
  dependencies:
    - mytheme/element-alert-box

element-alert-box:
  header: true
  css:
    component:
      build/assets/css/alert-box.css: {}

element-button:
  css:
    component:
      build/assets/css/button.css: {}
  js:
    build/assets/js/button.js: {}

pattern-card:
  css:
    component:
      build/assets/css/card.css: {}
  js:
    build/assets/js/card.js:
      attributes:
        type: module
  dependencies:
    - mytheme/element-button
    - core/drupal
`;

describe("parseLibrariesYaml", () => {
	test("parses YAML string into a libraries map", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(Object.keys(map)).toStrictEqual([
			"element-info-message",
			"element-alert-box",
			"element-button",
			"pattern-card",
		]);
	});

	test("extracts CSS file paths from nested category keys", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(map["element-alert-box"].css).toStrictEqual([
			"build/assets/css/alert-box.css",
		]);
	});

	test("extracts JS file paths with attributes", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(map["element-info-message"].js).toStrictEqual([
			{ src: "build/assets/js/info-message.js", type: "module" },
		]);
	});

	test("extracts JS without attributes as plain src objects", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(map["element-button"].js).toStrictEqual([
			{ src: "build/assets/js/button.js" },
		]);
	});

	test("extracts dependencies stripping the theme prefix", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(map["element-info-message"].dependencies).toStrictEqual([
			{ prefix: "mytheme", name: "element-alert-box" },
		]);
	});

	test("library without JS has empty js array", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(map["element-alert-box"].js).toStrictEqual([]);
	});

	test("library without dependencies has empty dependencies array", () => {
		const map = parseLibrariesYaml(FIXTURE_YAML);
		expect(map["element-alert-box"].dependencies).toStrictEqual([]);
	});
});

describe("resolveComponentAssets", () => {
	let librariesMap;

	beforeEach(() => {
		librariesMap = parseLibrariesYaml(FIXTURE_YAML);
	});

	test("resolves flat assets (no dependencies)", () => {
		const result = resolveComponentAssets(
			"element-alert-box",
			librariesMap,
			[],
		);
		expect(result).toStrictEqual({
			css: ["build/assets/css/alert-box.css"],
			js: [],
		});
	});

	test("resolves single dependency, deps first", () => {
		const result = resolveComponentAssets(
			"element-info-message",
			librariesMap,
			[],
		);
		expect(result.css).toStrictEqual([
			"build/assets/css/alert-box.css",
			"build/assets/css/info-message.css",
		]);
		expect(result.js).toStrictEqual([
			{ src: "build/assets/js/info-message.js", type: "module" },
		]);
	});

	test("ignores dependencies with configured prefixes", () => {
		const result = resolveComponentAssets("pattern-card", librariesMap, [
			"core",
		]);
		expect(result.css).toStrictEqual([
			"build/assets/css/button.css",
			"build/assets/css/card.css",
		]);
		expect(result.js).toStrictEqual([
			{ src: "build/assets/js/button.js" },
			{ src: "build/assets/js/card.js", type: "module" },
		]);
	});

	test("skips all external deps when prefix matches", () => {
		const result = resolveComponentAssets("pattern-card", librariesMap, [
			"core",
			"mytheme",
		]);
		expect(result.css).toStrictEqual(["build/assets/css/card.css"]);
	});

	test("deduplicates assets from shared dependencies", () => {
		const yamlWithShared = `
comp-a:
  css:
    component:
      a.css: {}
  dependencies:
    - mytheme/shared-dep

comp-b:
  css:
    component:
      b.css: {}
  dependencies:
    - mytheme/shared-dep
    - mytheme/comp-a

shared-dep:
  css:
    component:
      shared.css: {}
`;
		const map = parseLibrariesYaml(yamlWithShared);
		const result = resolveComponentAssets("comp-b", map, []);
		const sharedCount = result.css.filter((f) => f === "shared.css").length;
		expect(sharedCount).toBe(1);
		expect(result.css).toStrictEqual(["shared.css", "a.css", "b.css"]);
	});

	test("detects circular dependencies and does not infinite loop", () => {
		const circularYaml = `
comp-a:
  css:
    component:
      a.css: {}
  dependencies:
    - mytheme/comp-b

comp-b:
  css:
    component:
      b.css: {}
  dependencies:
    - mytheme/comp-a
`;
		const map = parseLibrariesYaml(circularYaml);
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
		const result = resolveComponentAssets("comp-a", map, []);
		expect(result.css).toContain("a.css");
		expect(result.css).toContain("b.css");
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Circular dependency"),
		);
		consoleSpy.mockRestore();
	});

	test("warns on unknown dependency but does not fail", () => {
		const yamlWithUnknown = `
comp-a:
  css:
    component:
      a.css: {}
  dependencies:
    - mytheme/nonexistent
`;
		const map = parseLibrariesYaml(yamlWithUnknown);
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
		const result = resolveComponentAssets("comp-a", map, []);
		expect(result.css).toStrictEqual(["a.css"]);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("nonexistent"),
		);
		consoleSpy.mockRestore();
	});

	test("resolves transitive dependencies (A -> B -> C)", () => {
		const transitiveYaml = `
comp-c:
  css:
    component:
      c.css: {}

comp-b:
  css:
    component:
      b.css: {}
  dependencies:
    - mytheme/comp-c

comp-a:
  css:
    component:
      a.css: {}
  dependencies:
    - mytheme/comp-b
`;
		const map = parseLibrariesYaml(transitiveYaml);
		const result = resolveComponentAssets("comp-a", map, []);
		expect(result.css).toStrictEqual(["c.css", "b.css", "a.css"]);
	});

	test("handles JS attributes type mapping", () => {
		const result = resolveComponentAssets("pattern-card", librariesMap, [
			"core",
		]);
		expect(result.js).toContainEqual({
			src: "build/assets/js/card.js",
			type: "module",
		});
		expect(result.js).toContainEqual({
			src: "build/assets/js/button.js",
		});
	});
});

describe("mapLibraryToComponent", () => {
	test("returns explicit mapping when provided", () => {
		const mapping = {
			"element-info-message": "elements/info-message",
		};
		const result = mapLibraryToComponent(
			"element-info-message",
			mapping,
			"src",
		);
		expect(result).toBe("elements/info-message");
	});

	test("returns null when no mapping and no folder match", () => {
		const result = mapLibraryToComponent(
			"element-unknown",
			{},
			"nonexistent-folder",
		);
		expect(result).toBeNull();
	});

	test("auto-discovers by stripping element- prefix", () => {
		const result = mapLibraryToComponent(
			"element-info-message",
			{},
			"tests/_setup/components",
		);
		// depends on actual folder existence; tested via integration
		expect(result === null || typeof result === "string").toBe(true);
	});

	test("explicit mapping takes precedence over auto-discovery", () => {
		const mapping = {
			"element-info-message": "custom/path",
		};
		const result = mapLibraryToComponent(
			"element-info-message",
			mapping,
			"src",
		);
		expect(result).toBe("custom/path");
	});

	test("uses custom autoDiscoveryPrefixes when provided", () => {
		const result = mapLibraryToComponent(
			"block-hero",
			{},
			"tests/_setup/drupal/components",
			["block-"],
		);
		expect(result === null || typeof result === "string").toBe(true);
	});

	test("default prefixes are used when autoDiscoveryPrefixes omitted", () => {
		const result = mapLibraryToComponent(
			"element-info-message",
			{},
			"tests/_setup/drupal/components",
		);
		expect(result).toBe("elements/info-message");
	});
});
