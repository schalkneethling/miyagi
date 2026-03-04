import { describe, test, expect, beforeAll, afterAll } from "vitest";
import getConfig from "../../../lib/init/config.js";

beforeAll(() => (process.env.MIYAGI_JS_API = true));
afterAll(() => (process.env.MIYAGI_JS_API = false));

describe("config processing", () => {
	describe("watch", () => {
		test("defaults to chokidar backend", () => {
			const config = getConfig({});
			expect(config.watch.backend).toBe("chokidar");
		});

		test("derives sources from components folder by default", () => {
			const config = getConfig({
				components: { folder: "src" },
			});
			expect(config.watch.sources).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: "components",
						type: "dir",
						path: "src",
					}),
				]),
			);
		});

		test("maps legacy ui.reloadAfterChanges.componentAssets to watch reload rules", () => {
			const config = getConfig({
				ui: {
					reloadAfterChanges: {
						componentAssets: true,
					},
				},
			});
			expect(config.watch.reload.rules.componentAsset).toBe("iframe");
			expect(config.watch.reload.rules.globalCss).toBe("iframe");
			expect(config.watch.reload.rules.globalJs).toBe("iframe");
		});

		test("fails when deprecated node-watch backend is configured", () => {
			expect(() =>
				getConfig({
					watch: {
						backend: "node-watch",
					},
				}),
			).toThrow(
				'`watch.backend="node-watch"` is no longer supported. Please use `watch.backend="chokidar"`. See https://docs.miyagi.dev/configuration/options/ for migration details.',
			);
		});
	});

	describe("assets.shared", () => {
		test("defaults to empty css and js arrays when not specified", () => {
			const config = getConfig({});
			expect(config.assets.shared).toStrictEqual({ css: [], js: [] });
		});

		test("processes shared.css through path sanitization", () => {
			const config = getConfig({
				assets: {
					shared: {
						css: ["./tokens.css", "/reset.css"],
					},
				},
			});
			expect(config.assets.shared.css).toStrictEqual([
				"tokens.css",
				"reset.css",
			]);
		});

		test("processes shared.js into normalized objects", () => {
			const config = getConfig({
				assets: {
					shared: {
						js: ["simple.js", { src: "complex.js", type: "module" }],
					},
				},
			});
			expect(config.assets.shared.js).toStrictEqual([
				{
					src: "simple.js",
					defer: undefined,
					async: undefined,
					type: undefined,
					position: "head",
				},
				{
					src: "complex.js",
					type: "module",
				},
			]);
		});

		test("preserves shared arrays when empty", () => {
			const config = getConfig({
				assets: {
					shared: { css: [], js: [] },
				},
			});
			expect(config.assets.shared.css).toStrictEqual([]);
			expect(config.assets.shared.js).toStrictEqual([]);
		});

		test("defaults missing shared.js to empty array", () => {
			const config = getConfig({
				assets: {
					shared: { css: ["tokens.css"] },
				},
			});
			expect(config.assets.shared.js).toStrictEqual([]);
		});

		test("defaults missing shared.css to empty array", () => {
			const config = getConfig({
				assets: {
					shared: { js: [{ src: "app.js" }] },
				},
			});
			expect(config.assets.shared.css).toStrictEqual([]);
		});
	});

	describe("assets.isolateComponents", () => {
		test("defaults to false when not specified", () => {
			const config = getConfig({});
			expect(config.assets.isolateComponents).toBe(false);
		});

		test("preserves true when explicitly set", () => {
			const config = getConfig({
				assets: { isolateComponents: true },
			});
			expect(config.assets.isolateComponents).toBe(true);
		});

		test("preserves false when explicitly set", () => {
			const config = getConfig({
				assets: { isolateComponents: false },
			});
			expect(config.assets.isolateComponents).toBe(false);
		});
	});
});
