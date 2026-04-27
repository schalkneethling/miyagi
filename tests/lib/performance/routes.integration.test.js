import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
} from "vitest";
import express from "express";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { attachPerformanceRoutes } from "../../../lib/performance/routes.js";
import { clearMeasureCache } from "../../../lib/performance/measure.js";

let tempCwd;
let server;
let port;

function writeFile(rel, contents) {
  const full = path.join(tempCwd, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
}

function makeRender() {
  return async (templatePath, variation) =>
    `<html><body>${templatePath}/${variation}</body></html>`;
}

async function startServer({ render } = {}) {
  const app = express();
  const registered = attachPerformanceRoutes(app, {
    cwd: tempCwd,
    render,
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  port = server.address().port;
  return registered;
}

beforeEach(() => {
  clearMeasureCache();
  tempCwd = mkdtempSync(path.join(tmpdir(), "miyagi-perf-routes-"));
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  rmSync(tempCwd, { recursive: true, force: true });
});

describe("performance API routes", () => {
  test("does not register routes when miyagi.performance.json is missing", async () => {
    const registered = await startServer();
    expect(registered).toBe(false);

    const response = await fetch(
      `http://localhost:${port}/api/performance/components`,
    );
    expect(response.status).toBe(404);
  });

  test("GET /api/performance/components returns measurements", async () => {
    writeFile("components/atoms/button/button.css", "x".repeat(1000));
    writeFile("components/atoms/button/button.js", "y".repeat(500));
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        compression: "raw",
        components: {
          "components/atoms/button": { css: { budget: "5 kB" }, js: {} },
        },
      }),
    );

    const registered = await startServer();
    expect(registered).toBe(true);

    const response = await fetch(
      `http://localhost:${port}/api/performance/components`,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].componentPath).toBe("components/atoms/button");
    expect(body[0].css.bytes).toBe(1000);
  });

  test("GET /api/performance/pages returns all configured pages", async () => {
    writeFile("components/atoms/button/button.css", "x");
    writeFile("components/atoms/button/button.js", "");
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        components: { "components/atoms/button": { css: {}, js: {} } },
        pages: {
          "templates/default": {
            variations: {
              home: { components: ["components/atoms/button"] },
            },
          },
        },
      }),
    );

    await startServer({ render: makeRender() });

    const response = await fetch(
      `http://localhost:${port}/api/performance/pages`,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].templatePath).toBe("templates/default");
    expect(body[0].variation).toBe("home");
  });

  test("GET /api/performance/pages/:templatePath/:variation returns a single match", async () => {
    writeFile("components/atoms/button/button.css", "x");
    writeFile("components/atoms/button/button.js", "");
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        components: { "components/atoms/button": { css: {}, js: {} } },
        pages: {
          "templates/default": {
            variations: {
              home: { components: ["components/atoms/button"] },
            },
          },
        },
      }),
    );

    await startServer({ render: makeRender() });

    const url = `http://localhost:${port}/api/performance/pages/${encodeURIComponent("templates/default")}/${encodeURIComponent("home")}`;
    const response = await fetch(url);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templatePath).toBe("templates/default");
    expect(body.variation).toBe("home");
  });

  test("GET /api/performance/pages/:templatePath/:variation 404s when no match", async () => {
    writeFile(
      "miyagi.performance.json",
      JSON.stringify({
        pages: {
          "templates/default": {
            variations: {
              home: { components: [] },
            },
          },
        },
      }),
    );

    await startServer({ render: makeRender() });

    const url = `http://localhost:${port}/api/performance/pages/${encodeURIComponent("templates/none")}/${encodeURIComponent("missing")}`;
    const response = await fetch(url);
    expect(response.status).toBe(404);
  });
});
