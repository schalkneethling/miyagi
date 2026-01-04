import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import defaultConfig from "../../../lib/default-config.js";
import Watcher from "../../../lib/init/watcher.js";

// Mock dependencies
vi.mock("node-watch", () => ({
	default: vi.fn(() => ({
		on: vi.fn(),
	})),
}));

vi.mock("ws", () => ({
	WebSocketServer: vi.fn(function () {
		this.on = vi.fn();
		return this;
	}),
}));

describe("Watcher", () => {
	let mockServer;
	let fsWatchSpy;

	beforeEach(() => {
		// Create a mock server object
		mockServer = {
			on: vi.fn(),
		};

		// Spy on fs.watch
		fsWatchSpy = vi.spyOn(fs, "watch").mockImplementation(() => {});

		// Setup global.config with default configuration
		global.config = {
			...defaultConfig.defaultUserConfig,
			components: {
				folder: "src",
				ignores: [],
			},
			docs: {
				folder: "docs",
			},
			assets: {
				root: "",
				folder: [],
				css: [],
				js: [],
			},
			extensions: [],
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete global.config;
	});

	describe("watchConfigFile option", () => {
		test("The `watchConfigFile` option is true by default", () => {
			expect(defaultConfig.defaultUserConfig.ui.watchConfigFile).toBe(true);
		});

		test("The file watcher is initialized when `userFileName` is set and `watchConfigFile` is true", () => {
			global.config.userFileName = ".miyagi.js";
			global.config.ui.watchConfigFile = true;

			Watcher(mockServer);

			expect(fsWatchSpy).toHaveBeenCalledWith(
				".miyagi.js",
				expect.any(Function),
			);
			expect(fsWatchSpy).toHaveBeenCalledTimes(1);
		});

		test("The file watcher is not initialized when `userFileName` is set but `watchConfigFile` is false", () => {
			global.config.userFileName = ".miyagi.js";
			global.config.ui.watchConfigFile = false;

			Watcher(mockServer);

			expect(fsWatchSpy).not.toHaveBeenCalled();
		});

		test("The file watcher is not initialized when `userFileName` is not set", () => {
			global.config.userFileName = null;
			global.config.ui.watchConfigFile = true;

			Watcher(mockServer);

			expect(fsWatchSpy).not.toHaveBeenCalled();
		});

		test("The file watcher is not initialized when `userFileName` is undefined", () => {
			global.config.userFileName = undefined;
			global.config.ui.watchConfigFile = true;

			Watcher(mockServer);

			expect(fsWatchSpy).not.toHaveBeenCalled();
		});
	});
});

