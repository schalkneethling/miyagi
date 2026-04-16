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

describe("performance routes (dev mode)", () => {
  test("GET /api/performance returns JSON with expected shape", async () => {
    const res = await fetch(`http://localhost:${port}/api/performance`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/json/);

    const body = await res.json();
    expect(body).toHaveProperty("measurement");
    expect(body).toHaveProperty("evaluations");
    expect(body).toHaveProperty("compression");
    expect(body).toHaveProperty("summary");
    expect(body.summary).toEqual(
      expect.objectContaining({
        ok: expect.any(Number),
        warn: expect.any(Number),
        exceed: expect.any(Number),
        unbudgeted: expect.any(Number),
      }),
    );
  });

  test("GET /iframe/performance renders the panel", async () => {
    const res = await fetch(`http://localhost:${port}/iframe/performance`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Performance budget");
    expect(html).toContain("PerformanceTable");
  });

  test("GET /performance renders the main chrome pointed at the iframe", async () => {
    const res = await fetch(`http://localhost:${port}/performance`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('src="/iframe/performance"');
  });
});
