import { describe, test, expect, beforeAll, afterAll } from "vitest";
import init from "../../../lib/index.js";

let server;
let port;

beforeAll(async () => {
	process.env.MIYAGI_JS_API = true;
	global.app = await init("api");

	await new Promise((resolve) => {
		server = global.app.listen(0, () => {
			port = server.address().port;
			resolve();
		});
	});
});

afterAll(async () => {
	process.env.MIYAGI_JS_API = false;
	if (server) await new Promise((resolve) => server.close(resolve));
});

describe("component asset isolation in rendered HTML", () => {
	describe("component with $assets (isolated)", () => {
		test("standalone variation includes shared + declared CSS only", async () => {
			const res = await fetch(
				`http://localhost:${port}/component?file=isolated&variation=default`,
			);
			const html = await res.text();

			// Should include shared CSS
			expect(html).toContain('href="shared.css"');
			// Should include declared component CSS
			expect(html).toContain('href="isolated.css"');
			// Should NOT include global-only CSS
			expect(html).not.toContain("global-only.css");
		});

		test("standalone variation includes shared + declared JS only", async () => {
			const res = await fetch(
				`http://localhost:${port}/component?file=isolated&variation=default`,
			);
			const html = await res.text();

			// Should include shared JS
			expect(html).toContain('src="shared.js"');
			// Should include declared component JS
			expect(html).toContain('src="isolated.js"');
			// Should NOT include global-only JS
			expect(html).not.toContain("global-only.js");
		});
	});

	describe("component without $assets (legacy fallback)", () => {
		test("standalone variation includes all global CSS", async () => {
			const res = await fetch(
				`http://localhost:${port}/component?file=button&variation=default`,
			);
			const html = await res.text();

			// Should include all global CSS (legacy behavior)
			expect(html).toContain('href="shared.css"');
			expect(html).toContain('href="global-only.css"');
		});

		test("standalone variation includes all global JS", async () => {
			const res = await fetch(
				`http://localhost:${port}/component?file=button&variation=default`,
			);
			const html = await res.text();

			// Should include all global JS (legacy behavior)
			expect(html).toContain('src="shared.js"');
			expect(html).toContain('src="global-only.js"');
		});
	});
});
