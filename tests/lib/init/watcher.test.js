import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import defaultConfig from "../../../lib/default-config.js";

const chokidarOnHandlers = {};
const wsServerHandlers = {};
const watcherInstance = {
  on: vi.fn((eventName, callback) => {
    chokidarOnHandlers[eventName] = callback;
    return watcherInstance;
  }),
  close: vi.fn(),
};
const watchMock = vi.fn(() => watcherInstance);
const mockSetState = vi.fn(async () => {});

vi.mock("chokidar", () => ({
  default: {
    watch: watchMock,
  },
}));

vi.mock("../../../lib/state/index.js", () => ({
  default: mockSetState,
}));

vi.mock("../../../lib/config.js", () => ({
  default: vi.fn(async () => ({})),
}));

vi.mock("../../../lib/state/file-contents.js", () => ({
  readFile: vi.fn(async () => ({})),
}));

vi.mock("../../../lib/logger.js", () => ({
  default: vi.fn(),
}));

vi.mock("ws", () => ({
  WebSocketServer: vi.fn(function MockWebSocketServer() {
    this.on = vi.fn((eventName, callback) => {
      wsServerHandlers[eventName] = callback;
      return this;
    });
    this.handleUpgrade = vi.fn((_request, _socket, _head, callback) => {
      callback({
        on: vi.fn(),
        readyState: 1,
        send: vi.fn(),
        ping: vi.fn(),
      });
    });
    this.emit = vi.fn((eventName, ws) => {
      if (eventName === "connection" && wsServerHandlers.connection) {
        wsServerHandlers.connection(ws);
      }
    });
    return this;
  }),
}));

const { default: Watcher } = await import("../../../lib/init/watcher.js");
const { default: mockLogger } = await import("../../../lib/logger.js");

describe("Watcher", () => {
  let mockServer;
  let consoleInfoSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    for (const key of Object.keys(chokidarOnHandlers))
      delete chokidarOnHandlers[key];
    for (const key of Object.keys(wsServerHandlers))
      delete wsServerHandlers[key];

    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockServer = {
      on: vi.fn(),
    };

    global.config = {
      ...defaultConfig.defaultUserConfig,
      components: {
        folder: "lib",
        ignores: [],
      },
      assets: {
        root: "",
        folder: [],
        css: [],
        js: [],
        customProperties: {
          files: [],
        },
        shared: {
          css: [],
          js: [],
        },
      },
      docs: {
        folder: null,
      },
      files: {
        ...defaultConfig.defaultUserConfig.files,
        templates: {
          ...defaultConfig.defaultUserConfig.files.templates,
          extension: "twig",
        },
      },
      extensions: [],
      watch: {
        ...defaultConfig.defaultUserConfig.watch,
        sources: [
          {
            id: "components",
            type: "dir",
            path: "lib",
            recursive: true,
          },
        ],
        behavior: {
          ...defaultConfig.defaultUserConfig.watch.behavior,
          startupGraceMs: 0,
        },
        report: {
          ...defaultConfig.defaultUserConfig.watch.report,
          enabled: true,
          onStart: true,
          format: "summary",
          useColors: false,
        },
      },
    };

    global.state = {
      fileContents: {},
      partials: {},
    };
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete global.config;
    delete global.state;
    vi.restoreAllMocks();
  });

  test("starts chokidar with configured sources", () => {
    Watcher(mockServer);

    expect(watchMock).toHaveBeenCalledTimes(1);
    expect(watchMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringMatching(/lib$/)]),
      expect.objectContaining({
        ignoreInitial: true,
        persistent: true,
      }),
    );
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  test("coalesces repeated events for same path", async () => {
    Watcher(mockServer);

    chokidarOnHandlers.all("change", "lib/example.txt");
    chokidarOnHandlers.all("change", "lib/example.txt");
    await vi.advanceTimersByTimeAsync(150);

    expect(mockSetState).toHaveBeenCalledTimes(1);
    const updatingStartedCalls = mockLogger.mock.calls.filter(
      ([type, message]) =>
        type === "info" &&
        typeof message === "string" &&
        message.includes("miyagi is updating the state"),
    );
    expect(updatingStartedCalls).toHaveLength(1);
    expect(mockSetState).toHaveBeenCalledWith({
      sourceTree: true,
      fileContents: true,
      menu: true,
      partials: true,
    });
  });

  test("prints resolved source list only when debug.logResolvedSources is enabled", () => {
    global.config.watch.report.format = "pretty";
    global.config.watch.debug.logResolvedSources = false;
    Watcher(mockServer);

    expect(
      consoleInfoSpy.mock.calls.some(([line]) =>
        String(line).includes("Resolved sources:"),
      ),
    ).toBe(false);

    consoleInfoSpy.mockClear();
    global.config.watch.debug.logResolvedSources = true;
    Watcher(mockServer);

    expect(
      consoleInfoSpy.mock.calls.some(([line]) =>
        String(line).includes("Resolved sources:"),
      ),
    ).toBe(true);
  });

  test("sends structured reload payload to websocket clients", async () => {
    Watcher(mockServer);

    const upgradeHandler = mockServer.on.mock.calls.find(
      ([eventName]) => eventName === "upgrade",
    )[1];

    const socket = {
      destroy: vi.fn(),
    };

    upgradeHandler(
      {
        url: "/__miyagi_ws",
        headers: { host: "localhost:5000" },
      },
      socket,
      Buffer.from(""),
    );

    const wsClient = {
      on: vi.fn(),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
    };
    wsServerHandlers.connection(wsClient);

    chokidarOnHandlers.all("change", "lib/example.txt");
    await vi.advanceTimersByTimeAsync(150);

    expect(wsClient.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(wsClient.send.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        type: "reload",
        scope: "parent",
      }),
    );
  });

  test("suppresses events during startup grace period", async () => {
    global.config.watch.behavior = {
      ...global.config.watch.behavior,
      startupGraceMs: 300,
    };

    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100)
      .mockReturnValueOnce(1400);

    Watcher(mockServer);

    chokidarOnHandlers.all("change", "lib/example.txt");
    await vi.advanceTimersByTimeAsync(150);

    expect(mockSetState).not.toHaveBeenCalled();

    chokidarOnHandlers.all("change", "lib/example.txt");
    await vi.advanceTimersByTimeAsync(150);

    expect(mockSetState).toHaveBeenCalledTimes(1);
  });
});
