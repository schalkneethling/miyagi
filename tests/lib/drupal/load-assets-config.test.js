import { describe, test, expect } from "vitest";
import path from "node:path";
import { loadAssetsConfig } from "../../../lib/drupal/load-assets-config.js";

const FIXTURES = path.resolve("tests/_setup/drupal");

describe("loadAssetsConfig", () => {
	test("loads config from a valid .miyagi-assets.js file", async () => {
		const config = await loadAssetsConfig({
			config: path.join(FIXTURES, "valid-config.js"),
		});
		expect(config.engine).toBe("drupal");
		expect(config.libraries).toBe("mytheme.libraries.yml");
	});

	test("reads the correct engine block based on engine key", async () => {
		const config = await loadAssetsConfig({
			config: path.join(FIXTURES, "valid-config.js"),
		});
		expect(config.ignorePrefixes).toStrictEqual(["core", "drupal"]);
		expect(config.mapping).toStrictEqual({
			"element-info-message": "elements/info-message",
			"element-alert-box": "elements/alert-box",
			"element-button": "elements/button",
			"element-card": "elements/card",
		});
	});

	test("CLI args override config file values", async () => {
		const config = await loadAssetsConfig({
			config: path.join(FIXTURES, "valid-config.js"),
			libraries: "override.libraries.yml",
			components: ["element-button"],
			ignorePrefixes: ["core", "other"],
		});
		expect(config.libraries).toBe("override.libraries.yml");
		expect(config.components).toStrictEqual(["element-button"]);
		expect(config.ignorePrefixes).toStrictEqual(["core", "other"]);
	});

	test("missing config file + no --libraries throws", async () => {
		await expect(
			loadAssetsConfig({
				config: "nonexistent.js",
			}),
		).rejects.toThrow();
	});

	test("missing config file + --libraries provided works (CLI-only)", async () => {
		const config = await loadAssetsConfig({
			config: "nonexistent.js",
			libraries: "cli-provided.libraries.yml",
		});
		expect(config.libraries).toBe("cli-provided.libraries.yml");
		expect(config.engine).toBe("drupal");
		expect(config.ignorePrefixes).toStrictEqual([]);
		expect(config.mapping).toStrictEqual({});
	});

	test("defaults are applied for missing optional fields", async () => {
		const config = await loadAssetsConfig({
			config: path.join(FIXTURES, "minimal-config.js"),
		});
		expect(config.ignorePrefixes).toStrictEqual([]);
		expect(config.mapping).toStrictEqual({});
		expect(config.components).toBeNull();
	});

	test("config without engine key throws", async () => {
		await expect(
			loadAssetsConfig({
				config: path.join(FIXTURES, "no-engine-config.js"),
			}),
		).rejects.toThrow(/engine/);
	});

	test("config with unsupported engine throws", async () => {
		await expect(
			loadAssetsConfig({
				config: path.join(FIXTURES, "unsupported-engine-config.js"),
			}),
		).rejects.toThrow();
	});

	test("config with missing engine block throws", async () => {
		await expect(
			loadAssetsConfig({
				config: path.join(FIXTURES, "missing-block-config.js"),
			}),
		).rejects.toThrow();
	});

	test("--dry-run is passed through", async () => {
		const config = await loadAssetsConfig({
			config: path.join(FIXTURES, "valid-config.js"),
			dryRun: true,
		});
		expect(config.dryRun).toBe(true);
	});

	test("dry-run defaults to false", async () => {
		const config = await loadAssetsConfig({
			config: path.join(FIXTURES, "valid-config.js"),
		});
		expect(config.dryRun).toBe(false);
	});
});
