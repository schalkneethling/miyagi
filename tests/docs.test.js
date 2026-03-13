import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

describe("docs consistency", () => {
  test("javascript-api.md documents schema-ref error type", () => {
    const content = readFileSync(
      path.join(ROOT, "docs/javascript-api.md"),
      "utf8",
    );
    expect(content).toContain("schema-ref");
    expect(content).toContain("mocks");
    expect(content).toContain("schema");
  });

  test("javascript-api.md uses correct package import path", () => {
    const content = readFileSync(
      path.join(ROOT, "docs/javascript-api.md"),
      "utf8",
    );
    expect(content).toContain("@schalkneethling/miyagi-core/api");
  });

  test("default-configuration.md is in sync with lib/default-config.js", () => {
    execSync("node scripts/docs/sync-default-config.mjs --check", {
      cwd: ROOT,
      encoding: "utf8",
    });
  });
});
