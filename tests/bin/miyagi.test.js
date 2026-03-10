import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("bin/miyagi.js", () => {
  test("prints help and exits successfully", () => {
    const result = spawnSync(
      process.execPath,
      [path.join("bin", "miyagi.js"), "--help"],
      {
        cwd: path.join(import.meta.dirname, "../.."),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("start");
    expect(result.stdout).toContain("drupal-assets");
  });
});
