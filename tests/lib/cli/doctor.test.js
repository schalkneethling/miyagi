import { mkdtempDisposable, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import doctor from "../../../lib/cli/doctor.js";
import { EXIT_CODES } from "../../../lib/errors.js";

describe("doctor", () => {
	let tmpDir;
	let tmpDirHandle;
	let previousCwd;

	beforeEach(async () => {
		previousCwd = process.cwd();
		tmpDirHandle = await mkdtempDisposable(
			path.join(os.tmpdir(), "miyagi-doctor-"),
		);
		tmpDir = tmpDirHandle.path;
		process.chdir(tmpDir);
	});

	afterEach(async () => {
		process.chdir(previousCwd);
		await tmpDirHandle.remove();
	});

	test("passes for a valid config", async () => {
		await mkdir(path.join(tmpDir, "src/components"), { recursive: true });
		await mkdir(path.join(tmpDir, "docs"), { recursive: true });
		await writeFile(
			path.join(tmpDir, ".miyagi.mjs"),
			`export default {
  components: { folder: "src/components" },
  docs: { folder: "docs" },
  engine: {
    render({ cb }) {
      return cb(null, "");
    }
  }
};
`,
		);

		const result = await doctor();

		expect(result).toStrictEqual({
			success: true,
			code: EXIT_CODES.SUCCESS,
			shouldExit: true,
		});
	});

	test("fails when engine.render is missing", async () => {
		await mkdir(path.join(tmpDir, "src/components"), { recursive: true });
		await writeFile(
			path.join(tmpDir, ".miyagi.mjs"),
			`export default {
  components: { folder: "src/components" }
};
`,
		);

		const result = await doctor();

		expect(result).toStrictEqual({
			success: false,
			code: EXIT_CODES.CONFIG_ERROR,
			shouldExit: true,
		});
	});
});
