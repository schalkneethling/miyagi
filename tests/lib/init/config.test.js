import { describe, test, expect, beforeAll, afterAll } from "vitest";
import getConfig from "../../../lib/init/config.js";

beforeAll(() => (process.env.MIYAGI_JS_API = true));
afterAll(() => (process.env.MIYAGI_JS_API = false));

describe("config processing", () => {
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
