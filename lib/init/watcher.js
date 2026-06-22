/**
 * Module for watching user file changes
 * @module initWatcher
 */

import anymatch from "anymatch";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";
import getConfig from "../config.js";
import yargs from "./args.js";
import setState from "../state/index.js";
import { readFile } from "../state/file-contents.js";
import * as helpers from "../helpers.js";
import log from "../logger.js";
import { t } from "../i18n/index.js";
import setEngines from "./engines.js";
import setStatic from "./static.js";
import setViews from "./views.js";
import { normalizeExtensions } from "../extensions.js";

const SOCKET_PATH = "/__miyagi_ws";
const sockets = new Set();
const DEFAULT_RELOAD_MESSAGE = {
  type: "reload",
  scope: "iframe",
  reason: "change",
  paths: [],
};
const RELOAD_SCOPES = new Set(["none", "iframe", "parent"]);
let restartFileWatcher = null;

/**
 * @param {string} eventType
 * @returns {number}
 */
function getEventPriority(eventType) {
  // Higher value = stronger event for the same path during burst coalescing.
  // Example: if a file emits "change" then "unlink", we keep "unlink".
  switch (eventType) {
    case "unlinkDir":
      return 5;
    case "unlink":
      return 4;
    case "addDir":
      return 3;
    case "add":
      return 2;
    case "change":
      return 1;
    default:
      return 0;
  }
}

/**
 * @param {string} inputPath
 * @returns {string}
 */
function normalizeRelativePath(inputPath) {
  const absolutePath = path.resolve(inputPath);
  return path.relative(process.cwd(), absolutePath);
}

/**
 * @param {object} source
 * @returns {string}
 */
function resolveSourcePath(source) {
  if (path.isAbsolute(source.path)) {
    return source.path;
  }

  return path.resolve(process.cwd(), source.path);
}

/**
 * @param {string} scope
 * @param {object} [payload]
 */
function sendReload(scope, payload = {}) {
  const normalizedScope = RELOAD_SCOPES.has(scope) ? scope : "parent";
  const reloadEnabled =
    global.config.watch?.reload?.enabled ?? global.config.ui.reload;

  if (!reloadEnabled || normalizedScope === "none") {
    return;
  }

  const message = JSON.stringify({
    ...DEFAULT_RELOAD_MESSAGE,
    ...payload,
    scope: normalizedScope,
  });

  for (const ws of sockets) {
    if (ws.readyState !== 1) {
      sockets.delete(ws);
      continue;
    }

    ws.send(message);
  }
}

/**
 * @param {string} color
 * @param {string} value
 * @param {boolean} useColors
 * @returns {string}
 */
function colorize(color, value, useColors) {
  if (!useColors) {
    return value;
  }

  const colors = {
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    grey: "\x1b[90m",
    reset: "\x1b[0m",
  };

  return `${colors[color] || ""}${value}${colors.reset}`;
}

/**
 * @param {object} report
 * @param {object} watchConfig
 */
function printWatchReport(report, watchConfig) {
  const reportConfig = watchConfig?.report || {};
  if (!reportConfig.enabled || !reportConfig.onStart) {
    return;
  }

  if (reportConfig.format === "json") {
    console.info(JSON.stringify(report));
    return;
  }

  const useColors = reportConfig.useColors && process.stdout.isTTY;

  if (reportConfig.format === "summary") {
    console.info(
      `${colorize("cyan", "Watch report:", useColors)} backend=${
        report.backend
      } sources=${report.meta.sourceCount} ignores=${report.meta.ignoreCount}`,
    );
    return;
  }

  console.info(colorize("cyan", "\nWatch report", useColors));
  console.info(
    `  ${colorize("grey", "Watcher backend:", useColors)} ${colorize(
      "green",
      report.backend,
      useColors,
    )}`,
  );
  console.info(
    `  ${colorize("grey", "Diagnostics:", useColors)} sources=${
      report.meta.sourceCount
    }, ignores=${report.meta.ignoreCount}`,
  );

  if (watchConfig?.debug?.logResolvedSources) {
    console.info(`  ${colorize("grey", "Resolved sources:", useColors)}`);

    for (const source of report.sources) {
      const stateLabel = source.exists ? "exists" : "missing";
      const stateColor = source.exists ? "green" : "yellow";
      console.info(
        `    - ${source.id} (${source.type}) ${source.resolvedPath} [${colorize(
          stateColor,
          stateLabel,
          useColors,
        )}]`,
      );
    }
  }

  console.info(`  ${colorize("grey", "Ignored patterns:", useColors)}`);
  for (const pattern of report.ignore.patterns) {
    console.info(`    - ${pattern}`);
  }

  console.info(`  ${colorize("grey", "Reload rules:", useColors)}`);
  for (const [key, scope] of Object.entries(report.reload.rules)) {
    console.info(`    - ${key}: ${scope}`);
  }
  console.info("");
}

/**
 * @param {object} watchConfig
 * @returns {object[]}
 */
function getExtensionSources(watchConfig) {
  const extensionSources = [];

  for (const { extension, options } of normalizeExtensions(
    global.config.extensions,
  )) {
    if (!extension.extendWatcher) {
      continue;
    }

    const extensionWatch = extension.extendWatcher(options);
    if (!extensionWatch?.folder || !extensionWatch?.lang) {
      continue;
    }

    extensionSources.push({
      id: `extension-${extensionWatch.lang}`,
      type: "dir",
      path: path.join(extensionWatch.folder, extensionWatch.lang),
      recursive: true,
      optional: true,
    });
  }

  return [...(watchConfig.sources || []), ...extensionSources];
}

/**
 * @param {object} watchConfig
 * @returns {object}
 */
function resolveWatchTargets(watchConfig) {
  const sources = getExtensionSources(watchConfig);
  const ignorePatterns = [
    ...(watchConfig.ignore?.defaults ? ["node_modules/**", ".git/**"] : []),
    ...(watchConfig.ignore?.patterns || []),
  ];
  const reportSources = [];
  const targets = [];

  for (const source of sources) {
    if (!source || typeof source.path !== "string") continue;
    const resolvedPath = resolveSourcePath(source);
    const exists = fs.existsSync(resolvedPath);

    reportSources.push({
      id: source.id,
      type: source.type,
      inputPath: source.path,
      resolvedPath,
      exists,
      recursive: source.recursive !== false,
      optional: source.optional === true,
      ignored: anymatch(ignorePatterns, normalizeRelativePath(resolvedPath)),
    });

    if (exists) {
      targets.push(resolvedPath);
    }
  }

  return {
    targets: [...new Set(targets)].sort(),
    ignorePatterns,
    report: {
      backend: "chokidar",
      sources: reportSources.sort((a, b) => a.id.localeCompare(b.id)),
      ignore: {
        defaultsEnabled: Boolean(watchConfig.ignore?.defaults),
        patterns: [...new Set(ignorePatterns)].sort(),
      },
      reload: {
        rules: watchConfig.reload.rules,
      },
      meta: {
        sourceCount: reportSources.length,
        ignoreCount: [...new Set(ignorePatterns)].length,
      },
    },
  };
}

/**
 * @param {Array<{ eventType: string, changedPath: string, relativePath: string }>} events
 * @returns {Promise<object>}
 */
async function updateFileContents(events) {
  const data = helpers.cloneDeep(global.state.fileContents);

  try {
    await Promise.all(
      events.map(async ({ changedPath, relativePath }) => {
        const fullPath = path.resolve(changedPath);

        if (
          fs.existsSync(fullPath) &&
          fs.lstatSync(fullPath).isFile() &&
          (helpers.fileIsTemplateFile(relativePath) ||
            helpers.fileIsDataFile(relativePath) ||
            helpers.fileIsDataJsonFile(relativePath) ||
            helpers.fileIsDocumentationFile(relativePath) ||
            helpers.fileIsSchemaFile(relativePath))
        ) {
          try {
            const result = await readFile(fullPath);
            data[fullPath] = result;
            return Promise.resolve();
          } catch (err) {
            return Promise.reject(err.message);
          }
        } else {
          delete data[fullPath];
          return Promise.resolve();
        }
      }),
    );

    return data;
  } catch (err) {
    log("error", err);
  }
}

/**
 * @param {string} changedPath
 * @returns {boolean}
 */
function pathExistsAsDirectory(changedPath) {
  return fs.existsSync(changedPath) && fs.lstatSync(changedPath).isDirectory();
}

/**
 * @param {Array<{ eventType: string, changedPath: string, relativePath: string }>} events
 * @returns {Promise<void>}
 */
async function handleFileChange(events) {
  for (const { extension, options } of normalizeExtensions(
    global.config.extensions,
  )) {
    if (extension.callbacks?.fileChanged) {
      await extension.callbacks.fileChanged(options);
    }
  }

  const watchRules = global.config.watch.reload.rules;
  const templateEvents = events.filter(({ relativePath }) =>
    helpers.fileIsTemplateFile(relativePath),
  );
  const dataEvents = events.filter(({ relativePath }) =>
    helpers.fileIsDataFile(relativePath),
  );
  const docEvents = events.filter(({ relativePath }) =>
    helpers.fileIsDocumentationFile(relativePath),
  );
  const schemaEvents = events.filter(({ relativePath }) =>
    helpers.fileIsSchemaFile(relativePath),
  );
  const dataJsonEvents = events.filter(({ relativePath }) =>
    helpers.fileIsDataJsonFile(relativePath),
  );
  const componentAssetEvents = events.filter(({ relativePath }) =>
    helpers.fileIsAssetFile(relativePath),
  );
  const cssEvents = events.filter(({ relativePath }) =>
    relativePath.endsWith(".css"),
  );
  const jsEvents = events.filter(({ relativePath }) =>
    relativePath.endsWith(".js"),
  );
  const hasRemoveEvents = events.some(({ eventType }) =>
    ["unlink", "unlinkDir"].includes(eventType),
  );
  const hasDirectoryEvents = events.some(
    ({ changedPath, eventType }) =>
      ["addDir", "unlinkDir"].includes(eventType) ||
      pathExistsAsDirectory(changedPath),
  );

  const configFilePath = global.config.userFileName
    ? path.resolve(process.cwd(), global.config.userFileName)
    : null;
  const hasConfigFileEvent =
    configFilePath &&
    events.some(
      ({ changedPath }) => path.resolve(changedPath) === configFilePath,
    );

  if (hasConfigFileEvent && global.config.watch.configFile.enabled) {
    await configurationFileUpdated();
    sendReload("parent", {
      reason: "config",
      paths: [global.config.userFileName],
    });
    return;
  }

  if (
    hasDirectoryEvents &&
    !hasRemoveEvents &&
    templateEvents.length === 0 &&
    dataEvents.length === 0 &&
    docEvents.length === 0 &&
    schemaEvents.length === 0 &&
    componentAssetEvents.length === 0 &&
    cssEvents.length === 0 &&
    jsEvents.length === 0
  ) {
    await setState({
      sourceTree: true,
      fileContents: true,
      menu: true,
      partials: true,
    });

    sendReload(watchRules.unknown, {
      reason: "directory",
      paths: events.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (hasRemoveEvents) {
    await setState({
      sourceTree: true,
      fileContents: await updateFileContents(events),
      menu: true,
      partials: true,
    });

    sendReload("parent", {
      reason: "remove",
      paths: events.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (templateEvents.length > 0) {
    const allTemplatePathsExistAsPartials = templateEvents.every(
      ({ relativePath }) => {
        const shortPath = relativePath.replace(
          path.join(global.config.components.folder, "/"),
          "",
        );
        return Object.keys(global.state.partials).includes(shortPath);
      },
    );

    if (allTemplatePathsExistAsPartials) {
      await setState({
        fileContents: await updateFileContents(templateEvents),
      });

      sendReload(watchRules.template, {
        reason: "template",
        paths: templateEvents.map(({ relativePath }) => relativePath),
      });
    } else {
      await setState({
        fileContents: await updateFileContents(templateEvents),
        sourceTree: true,
        menu: true,
        partials: true,
      });

      sendReload("parent", {
        reason: "template-added",
        paths: templateEvents.map(({ relativePath }) => relativePath),
      });
    }

    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (dataEvents.length > 0) {
    const hasBeenAdded = dataEvents.some(
      ({ eventType, changedPath }) =>
        eventType === "add" ||
        !Object.keys(global.state.fileContents).includes(
          path.resolve(changedPath),
        ),
    );

    await setState({
      fileContents: await updateFileContents(dataEvents),
      sourceTree: hasBeenAdded,
      menu: true,
    });

    sendReload(watchRules.data, {
      reason: hasBeenAdded ? "data-added" : "data",
      paths: dataEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (docEvents.length > 0) {
    const hasBeenAdded = docEvents.some(
      ({ eventType, changedPath }) =>
        eventType === "add" ||
        !Object.keys(global.state.fileContents).includes(
          path.resolve(changedPath),
        ),
    );

    await setState({
      fileContents: await updateFileContents(docEvents),
      sourceTree: hasBeenAdded,
      menu: hasBeenAdded,
    });

    sendReload(watchRules.docs, {
      reason: hasBeenAdded ? "docs-added" : "docs",
      paths: docEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (schemaEvents.length > 0) {
    await setState({
      fileContents: await updateFileContents(schemaEvents),
    });

    sendReload(watchRules.schema, {
      reason: "schema",
      paths: schemaEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (dataJsonEvents.length > 0) {
    await setState({
      fileContents: await updateFileContents(dataJsonEvents),
    });

    sendReload(watchRules.data, {
      reason: "data-json",
      paths: dataJsonEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (componentAssetEvents.length > 0) {
    sendReload(watchRules.componentAsset, {
      reason: "component-asset",
      paths: componentAssetEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (cssEvents.length > 0) {
    if (
      cssEvents.some(({ relativePath }) =>
        global.config.assets.customProperties.files.includes(relativePath),
      )
    ) {
      await setState({
        css: true,
      });
    } else {
      await setState({
        menu: true,
      });
    }

    sendReload(watchRules.globalCss, {
      reason: "css",
      paths: cssEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  if (jsEvents.length > 0) {
    await setState({
      menu: true,
    });

    sendReload(watchRules.globalJs, {
      reason: "js",
      paths: jsEvents.map(({ relativePath }) => relativePath),
    });
    log("success", `${t("updatingDone")}\n`);
    return;
  }

  await setState({
    sourceTree: true,
    fileContents: true,
    menu: true,
    partials: true,
  });

  sendReload(watchRules.unknown, {
    reason: "unknown",
    paths: events.map(({ relativePath }) => relativePath),
  });
  log("success", `${t("updatingDone")}\n`);
}

/**
 * @param {object} pendingByPath
 * @returns {Array<{ eventType: string, changedPath: string, relativePath: string }>}
 */
function snapshotPendingEvents(pendingByPath) {
  return (
    [...pendingByPath.values()]
      // Process highest-priority events first to keep structural changes deterministic.
      .sort(
        (a, b) => getEventPriority(b.eventType) - getEventPriority(a.eventType),
      )
      .map((entry) => ({
        eventType: entry.eventType,
        changedPath: entry.changedPath,
        relativePath: normalizeRelativePath(entry.changedPath),
      }))
  );
}

/**
 * @param {object} server
 */
export default function Watcher(server) {
  const wss = new WebSocketServer({ noServer: true });
  let watcher;
  let debounceTimer = null;
  let isProcessing = false;
  let watcherStartedAt = null;
  const pendingByPath = new Map();

  const startHeartbeat = () => {
    const heartbeatConfig = global.config.watch?.socket?.heartbeat;
    if (!heartbeatConfig?.enabled) {
      return null;
    }

    return setInterval(() => {
      for (const ws of sockets) {
        if (ws.readyState !== 1) {
          sockets.delete(ws);
          continue;
        }

        ws.ping();
      }
    }, heartbeatConfig.intervalMs);
  };

  const heartbeatInterval = startHeartbeat();

  const processPendingEvents = async () => {
    if (isProcessing) {
      return;
    }

    if (pendingByPath.size === 0) {
      return;
    }

    isProcessing = true;
    try {
      log("info", t("updatingStarted"));
      const events = snapshotPendingEvents(pendingByPath);
      pendingByPath.clear();
      await handleFileChange(events);
    } catch (error) {
      log("error", "Error while processing file changes.", error);
    } finally {
      isProcessing = false;
      if (pendingByPath.size > 0) {
        void processPendingEvents();
      }
    }
  };

  const enqueueEvent = (eventType, changedPath) => {
    const graceMs = global.config.watch?.behavior?.startupGraceMs ?? 0;
    if (
      watcherStartedAt &&
      graceMs > 0 &&
      Date.now() - watcherStartedAt < graceMs
    ) {
      return;
    }

    const absolutePath = path.resolve(changedPath);
    const existing = pendingByPath.get(absolutePath);
    const shouldReplace =
      !existing ||
      getEventPriority(eventType) >= getEventPriority(existing.eventType);

    if (shouldReplace) {
      // Keep only the strongest event per path inside the coalescing window.
      pendingByPath.set(absolutePath, {
        eventType,
        changedPath: absolutePath,
      });
    }

    const watchBehavior = global.config.watch?.behavior || {};
    const delay = Math.max(
      watchBehavior.debounceMs || 0,
      watchBehavior.coalesceWindowMs || 0,
    );

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void processPendingEvents();
    }, delay);
  };

  const setupFileWatcher = () => {
    const watchConfig = global.config.watch || {};
    if (watchConfig.enabled === false) {
      return;
    }

    if (watcher) {
      void watcher.close();
    }

    const { targets, ignorePatterns, report } =
      resolveWatchTargets(watchConfig);
    const awaitWriteFinish = watchConfig.behavior?.awaitWriteFinish || {};

    printWatchReport(report, watchConfig);

    if (targets.length === 0) {
      log("error", t("watchingFilesFailed"));
      return;
    }

    watcher = chokidar.watch(targets, {
      ignoreInitial: true,
      persistent: true,
      ignored(changedPath) {
        const relativePath = normalizeRelativePath(changedPath);
        return anymatch(ignorePatterns, relativePath);
      },
      awaitWriteFinish: awaitWriteFinish.enabled
        ? {
            stabilityThreshold: awaitWriteFinish.stabilityThresholdMs,
            pollInterval: awaitWriteFinish.pollIntervalMs,
          }
        : false,
    });

    watcher.on("all", (eventType, changedPath) => {
      const watchDebug = global.config.watch?.debug || {};
      if (watchDebug.logEvents) {
        log("info", `watch:event=${eventType} path=${changedPath}`);
      }

      enqueueEvent(eventType, changedPath);
    });

    watcher.on("error", (error) => {
      log("error", t("watchingFilesFailed"), error);
    });

    watcherStartedAt = Date.now();
  };
  restartFileWatcher = setupFileWatcher;

  wss.on("connection", function open(ws) {
    sockets.add(ws);

    ws.on("close", () => {
      sockets.delete(ws);
    });

    ws.on("error", () => {
      sockets.delete(ws);
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const requestUrl = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );

    if (requestUrl.pathname !== SOCKET_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  setupFileWatcher();

  server.on("close", () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    if (watcher) {
      void watcher.close();
    }
  });
}

/**
 * @returns {Promise<void>}
 */
async function configurationFileUpdated() {
  log("info", t("updatingConfiguration"));

  const config = await getConfig(yargs.argv);

  if (config) {
    global.config = config;
    if (restartFileWatcher) {
      restartFileWatcher();
    }
    await setEngines();
    await setState({
      sourceTree: true,
      fileContents: true,
      menu: true,
      partials: true,
      css: true,
    });

    setStatic();
    setViews();

    log("success", `${t("updatingConfigurationDone")}\n`);
  }
}
