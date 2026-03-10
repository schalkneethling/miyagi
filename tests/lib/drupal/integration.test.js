// @ts-check

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { readFile, cp, rm } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import drupalAssets from "../../../lib/cli/drupal-assets.js";

const FIXTURES = path.resolve("tests/_setup/drupal");
const WORK_DIR = path.resolve("tests/_setup/drupal-work");

describe("drupal-assets CLI integration", () => {
  beforeEach(async () => {
    await cp(
      path.join(FIXTURES, "components"),
      path.join(WORK_DIR, "components"),
      {
        recursive: true,
      },
    );

    global.config = {
      components: { folder: path.join(WORK_DIR, "components") },
      files: {
        mocks: { name: "mocks", extension: ["yaml", "yml", "json", "js"] },
      },
    };
  });

  afterEach(async () => {
    await rm(WORK_DIR, { recursive: true, force: true });
    delete global.config;
  });

  test("updates $assets in info-message mock with resolved dependencies", async () => {
    const exitSpy = mockProcessExit();

    await drupalAssets({
      config: path.join(FIXTURES, "valid-config.js"),
      libraries: path.join(FIXTURES, "mytheme.libraries.yml"),
      components: ["element-info-message"],
    });

    const content = JSON.parse(
      await readFile(
        path.join(WORK_DIR, "components/elements/info-message/mocks.json"),
        "utf8",
      ),
    );

    expect(content.$assets).toBeDefined();
    expect(content.$assets.css).toContain("build/assets/css/alert-box.css");
    expect(content.$assets.css).toContain("build/assets/css/info-message.css");
    expect(content.$assets.js).toContainEqual({
      src: "build/assets/js/info-message.js",
      type: "module",
    });
    expect(content.tone).toBe("info");

    exitSpy.mockRestore();
  });

  test("updates all components when no --components specified", async () => {
    const exitSpy = mockProcessExit();

    await drupalAssets({
      config: path.join(FIXTURES, "valid-config.js"),
      libraries: path.join(FIXTURES, "mytheme.libraries.yml"),
      ignorePrefixes: ["core"],
    });

    const infoMsg = JSON.parse(
      await readFile(
        path.join(WORK_DIR, "components/elements/info-message/mocks.json"),
        "utf8",
      ),
    );
    expect(infoMsg.$assets).toBeDefined();

    const alertBox = JSON.parse(
      await readFile(
        path.join(WORK_DIR, "components/elements/alert-box/mocks.json"),
        "utf8",
      ),
    );
    expect(alertBox.$assets).toBeDefined();
    expect(alertBox.$assets.css).toStrictEqual([
      "build/assets/css/alert-box.css",
    ]);

    exitSpy.mockRestore();
  });

  test("dry-run does not modify files", async () => {
    const exitSpy = mockProcessExit();

    const before = await readFile(
      path.join(WORK_DIR, "components/elements/info-message/mocks.json"),
      "utf8",
    );

    await drupalAssets({
      config: path.join(FIXTURES, "valid-config.js"),
      libraries: path.join(FIXTURES, "mytheme.libraries.yml"),
      components: ["element-info-message"],
      dryRun: true,
    });

    const after = await readFile(
      path.join(WORK_DIR, "components/elements/info-message/mocks.json"),
      "utf8",
    );

    expect(after).toBe(before);

    exitSpy.mockRestore();
  });

  test("ignores external dependencies based on ignorePrefixes", async () => {
    const exitSpy = mockProcessExit();

    await drupalAssets({
      config: path.join(FIXTURES, "valid-config.js"),
      libraries: path.join(FIXTURES, "mytheme.libraries.yml"),
      components: ["element-button"],
      ignorePrefixes: ["core"],
    });

    const content = JSON.parse(
      await readFile(
        path.join(WORK_DIR, "components/elements/button/mocks.json"),
        "utf8",
      ),
    );

    expect(content.$assets.css).toStrictEqual(["build/assets/css/button.css"]);
    expect(content.$assets.js).toStrictEqual([
      { src: "build/assets/js/button.js" },
    ]);

    exitSpy.mockRestore();
  });

  test("updates $assets in a YAML mock file", async () => {
    const exitSpy = mockProcessExit();

    await drupalAssets({
      config: path.join(FIXTURES, "valid-config.js"),
      libraries: path.join(FIXTURES, "mytheme.libraries.yml"),
      components: ["element-card"],
    });

    const raw = await readFile(
      path.join(WORK_DIR, "components/elements/card/mocks.yaml"),
      "utf8",
    );
    /** @type {Record<string, unknown>} */
    const content = /** @type {Record<string, unknown>} */ (yaml.load(raw));

    expect(content.$assets).toBeDefined();
    const assets = /** @type {Record<string, unknown>} */ (content.$assets);
    expect(assets.css).toStrictEqual(["build/assets/css/card.css"]);
    expect(assets.js).toStrictEqual([
      { src: "build/assets/js/card.js", type: "module" },
    ]);
    expect(content.message).toBe("This is a warning info message.");

    exitSpy.mockRestore();
  });

  test("re-running produces identical output (idempotent)", async () => {
    const exitSpy = mockProcessExit();

    const args = {
      config: path.join(FIXTURES, "valid-config.js"),
      libraries: path.join(FIXTURES, "mytheme.libraries.yml"),
      components: ["element-info-message"],
    };

    await drupalAssets(args);
    const first = await readFile(
      path.join(WORK_DIR, "components/elements/info-message/mocks.json"),
      "utf8",
    );

    await drupalAssets(args);
    const second = await readFile(
      path.join(WORK_DIR, "components/elements/info-message/mocks.json"),
      "utf8",
    );

    expect(second).toBe(first);

    exitSpy.mockRestore();
  });
});

/**
 * Stubs process.exit to prevent the CLI handler's error paths
 * from terminating the Vitest process.
 */
function mockProcessExit() {
  const original = process.exit;
  // @ts-expect-error -- intentional no-op stub
  process.exit = () => {};
  return { mockRestore: () => (process.exit = original) };
}
