import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import init from "../../../lib/index.js";
import {
  validateAllHtml,
  validateComponentHtml,
  validateHtmlFiles,
} from "../../../lib/validator/html.js";

beforeAll(() => (process.env.MIYAGI_JS_API = true));
afterAll(() => (process.env.MIYAGI_JS_API = false));
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateComponentHtml", () => {
  test("validates a component with valid HTML", async () => {
    const component = await getComponentsObject("button");
    const result = await validateComponentHtml(component);

    expect(result.component).toBe("button");
    expect(result.variations.length).toBeGreaterThan(0);
    expect(result.variations[0]).toHaveProperty("name");
    expect(result.variations[0]).toHaveProperty("valid");
    expect(result.variations[0]).toHaveProperty("messages");
  });

  test("includes all variations", async () => {
    const component = await getComponentsObject("button");
    const result = await validateComponentHtml(component);

    const names = result.variations.map((v) => v.name);
    expect(names).toContain("default");
    expect(names).toContain("variant");
  });
});

describe("validateAllHtml", () => {
  test("returns results for all components", async () => {
    global.app = await init("api");
    const results = await validateAllHtml();

    expect(results).toHaveProperty("components");
    expect(results).toHaveProperty("summary");
    expect(results.components.length).toBeGreaterThan(0);
    expect(results.summary).toHaveProperty("total");
    expect(results.summary).toHaveProperty("passed");
    expect(results.summary).toHaveProperty("failed");
    expect(results.summary).toHaveProperty("errors");
    expect(results.summary).toHaveProperty("warnings");
    expect(results.summary.total).toBe(results.components.length);
  });
});

describe("validateHtmlFiles", () => {
  test("returns empty results for non-matching glob", async () => {
    global.app = await init("api");
    const results = await validateHtmlFiles(
      "tests/_setup/nonexistent-*.html",
    );

    expect(results.components).toStrictEqual([]);
    expect(results.summary.total).toBe(0);
  });
});

async function getComponentsObject(component) {
  global.app = await init("api");

  return global.state.routes.find(
    (route) => route.paths.dir.short === component,
  );
}
