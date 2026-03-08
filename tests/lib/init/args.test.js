import { describe, expect, test, vi } from "vitest";
import createCli from "../../../lib/init/args.js";
import { EXIT_CODES } from "../../../lib/errors.js";

describe("createCli", () => {
	test("passes typed positional args to the new command handler", async () => {
		const handlers = {
			start: vi.fn(),
			build: vi.fn(),
			new: vi.fn().mockResolvedValue({ success: true, code: 0, shouldExit: true }),
			mocks: vi.fn(),
			lint: vi.fn(),
			drupalAssets: vi.fn(),
			doctor: vi.fn(),
		};
		const { cli, getResult } = createCli(handlers, [
			"node",
			"miyagi",
			"new",
			"atoms/button",
			"--only",
			"tpl",
			"docs",
			"--verbose",
		]);

		await cli.parseAsync();

		expect(handlers.new).toHaveBeenCalledWith(
			expect.objectContaining({
				component: "atoms/button",
				only: ["tpl", "docs"],
				verbose: true,
			}),
		);
		expect(getResult()).toStrictEqual({
			success: true,
			code: 0,
			shouldExit: true,
		});
	});

	test("parses optional component and drupal-assets flags", async () => {
		const handlers = {
			start: vi.fn(),
			build: vi.fn(),
			new: vi.fn(),
			mocks: vi.fn(),
			lint: vi.fn().mockResolvedValue({ success: true, code: 0, shouldExit: true }),
			drupalAssets: vi
				.fn()
				.mockResolvedValue({ success: true, code: 0, shouldExit: true }),
			doctor: vi.fn(),
		};
		const lintCli = createCli(handlers, ["node", "miyagi", "lint"]);
		await lintCli.cli.parseAsync();

		expect(handlers.lint).toHaveBeenCalledWith(
			expect.objectContaining({}),
		);

		const drupalCli = createCli(handlers, [
			"node",
			"miyagi",
			"drupal-assets",
			"--dry-run",
			"--ignore-prefixes",
			"core",
			"drupal",
		]);
		await drupalCli.cli.parseAsync();

		expect(handlers.drupalAssets).toHaveBeenCalledWith(
			expect.objectContaining({
				dryRun: true,
				ignorePrefixes: ["core", "drupal"],
			}),
		);
	});

	test("returns cli usage errors for invalid commands", async () => {
		const handlers = {
			start: vi.fn(),
			build: vi.fn(),
			new: vi.fn(),
			mocks: vi.fn(),
			lint: vi.fn(),
			drupalAssets: vi.fn(),
			doctor: vi.fn(),
		};
		const { cli } = createCli(handlers, ["node", "miyagi", "wat"]);

		try {
			await cli.parseAsync();
		} catch (error) {
			expect(error).toMatchObject({
				code: EXIT_CODES.CLI_USAGE_ERROR,
			});
		}
	});
});
