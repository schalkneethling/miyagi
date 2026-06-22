/**
 * Module for sanitizing the user configuration and merging it with the default configuration
 * @module initConfig
 */

import deepMerge from "deepmerge";
import log from "../logger.js";
import appConfig from "../default-config.js";
import { t, available as langAvailable } from "../i18n/index.js";
import { LINT_LOG_LEVELS } from "../constants/lint-log-levels.js";
import fs from "fs";
import path from "path";
import { applyExtensionConfig } from "../extensions.js";

const { defaultUserConfig } = appConfig;

/**
 * @param {string} path - unsanitized directory or file path
 * @returns {string} the given path sanitized
 */
function sanitizePath(path) {
  if (path === null) return path;

  let sanitizedPath = path;

  if (sanitizedPath.startsWith("./")) {
    sanitizedPath = sanitizedPath.slice(2);
  } else if (sanitizedPath.startsWith("/")) {
    sanitizedPath = sanitizedPath.slice(1);
  }

  if (sanitizedPath === "." || sanitizedPath === "/") {
    sanitizedPath = "";
  }

  if (sanitizedPath.endsWith("/")) {
    sanitizedPath = sanitizedPath.slice(0, -1);
  }

  return sanitizedPath;
}

/**
 * Keep watch paths relative-friendly (do not strip leading slash),
 * but normalize common user input like "./foo/"
 * @param {string} watchPath
 * @returns {string}
 */
function sanitizeWatchPath(watchPath) {
  if (typeof watchPath !== "string") {
    return watchPath;
  }

  let sanitizedPath = watchPath;

  if (sanitizedPath.startsWith("./")) {
    sanitizedPath = sanitizedPath.slice(2);
  }

  if (sanitizedPath.endsWith("/")) {
    sanitizedPath = sanitizedPath.slice(0, -1);
  }

  return sanitizedPath;
}

/**
 * @param {string|Array} strOrArr - file path or array of file paths
 * @returns {Array} the given file path in an array or simply the given array
 */
function arrayfy(strOrArr) {
  return Array.isArray(strOrArr) ? strOrArr : [strOrArr];
}

/**
 * @param {object} merged
 * @returns {object[]}
 */
function getDefaultWatchSources(merged) {
  const sources = [];
  const sourceByPath = new Set();

  const addSource = (source) => {
    if (
      !source ||
      typeof source.path !== "string" ||
      source.path.length === 0
    ) {
      return;
    }

    const key = `${source.type}:${source.path}`;
    // Deduplicate watch targets; While calling add on Set will dedup,
    // we need a conditional to avoid adding duplicates to the `sources` array.
    if (sourceByPath.has(key)) {
      return;
    }

    sourceByPath.add(key);
    sources.push(source);
  };

  if (merged.components.folder) {
    addSource({
      id: "components",
      type: "dir",
      path: sanitizeWatchPath(merged.components.folder),
      recursive: true,
    });
  }

  if (merged.docs?.folder) {
    addSource({
      id: "docs",
      type: "dir",
      path: sanitizeWatchPath(merged.docs.folder),
      recursive: true,
      optional: true,
    });
  }

  for (const folder of merged.assets.folder || []) {
    addSource({
      id: `assets-folder-${folder}`,
      type: "dir",
      path: sanitizeWatchPath(path.join(merged.assets.root, folder)),
      recursive: true,
      optional: true,
    });
  }

  const localCssFiles = [
    ...(merged.assets.css || []),
    ...(merged.assets.shared?.css || []),
  ]
    .filter((filePath) => !filePath.startsWith("http://"))
    .filter((filePath) => !filePath.startsWith("https://"))
    .filter((filePath) => !filePath.startsWith("://"));

  for (const cssFile of localCssFiles) {
    addSource({
      id: `assets-css-${cssFile}`,
      type: "file",
      path: sanitizeWatchPath(path.join(merged.assets.root, cssFile)),
      optional: true,
    });
  }

  const localJsFiles = [
    ...(merged.assets.js || []),
    ...(merged.assets.shared?.js || []),
  ]
    .map((entry) => entry.src || entry)
    .filter((filePath) => typeof filePath === "string")
    .filter((filePath) => !filePath.startsWith("http://"))
    .filter((filePath) => !filePath.startsWith("https://"))
    .filter((filePath) => !filePath.startsWith("://"));

  for (const jsFile of localJsFiles) {
    addSource({
      id: `assets-js-${jsFile}`,
      type: "file",
      path: sanitizeWatchPath(path.join(merged.assets.root, jsFile)),
      optional: true,
    });
  }

  if (merged.userFileName && merged.watch?.configFile?.enabled) {
    addSource({
      id: "config-file",
      type: "file",
      path: sanitizeWatchPath(merged.userFileName),
      optional: true,
    });
  }

  return sources;
}

/**
 * @param {object} watchConfig
 * @returns {object[]}
 */
function normalizeWatchSources(watchConfig) {
  if (!Array.isArray(watchConfig.sources) || watchConfig.sources.length === 0) {
    return [];
  }

  return watchConfig.sources
    .map((source, index) => {
      if (
        !source ||
        typeof source.path !== "string" ||
        source.path.length === 0
      ) {
        return null;
      }

      const type = source.type === "file" ? "file" : "dir";

      return {
        id: source.id || `source-${index + 1}`,
        type,
        path: sanitizeWatchPath(source.path),
        recursive: source.recursive !== false,
        optional: source.optional === true,
      };
    })
    .filter(Boolean);
}

/**
 * Applies legacy watch-related config keys to watch config
 * while preserving explicit new watch config values.
 * @param {object} merged
 * @param {object} userConfig
 */
function applyLegacyWatchCompatibility(merged, userConfig) {
  merged.watch.configFile = merged.watch.configFile || { enabled: true };
  merged.watch.configFile.enabled =
    typeof merged.watch.configFile.enabled === "boolean"
      ? merged.watch.configFile.enabled
      : merged.ui.watchConfigFile;

  merged.watch.reload = merged.watch.reload || {};
  merged.watch.reload.enabled =
    typeof merged.watch.reload.enabled === "boolean"
      ? merged.watch.reload.enabled
      : merged.ui.reload;

  const userReloadRules = userConfig.watch?.reload?.rules || {};
  merged.watch.reload.rules = {
    ...defaultUserConfig.watch.reload.rules,
    ...(merged.watch.reload.rules || {}),
    componentAsset:
      userReloadRules.componentAsset ??
      (merged.ui.reloadAfterChanges.componentAssets
        ? "iframe"
        : defaultUserConfig.watch.reload.rules.componentAsset),
    globalCss:
      userReloadRules.globalCss ??
      (merged.ui.reloadAfterChanges.componentAssets
        ? "iframe"
        : defaultUserConfig.watch.reload.rules.globalCss),
    globalJs:
      userReloadRules.globalJs ??
      (merged.ui.reloadAfterChanges.componentAssets
        ? "iframe"
        : defaultUserConfig.watch.reload.rules.globalJs),
  };

  merged.watch.ignore = merged.watch.ignore || {};
  merged.watch.ignore.patterns = [
    ...(merged.watch.ignore.patterns || []),
    ...(merged.components.ignores || []),
  ].filter((entry) => typeof entry === "string");
  merged.watch.ignore.patterns = [...new Set(merged.watch.ignore.patterns)];
}

/**
 * Normalizes and validates new watch config values.
 * @param {object} merged
 */
function normalizeAndValidateWatchConfig(merged) {
  if (merged.watch?.backend === "node-watch") {
    throw new Error(
      '`watch.backend="node-watch"` is no longer supported. Please use `watch.backend="chokidar"`. See https://docs.miyagi.dev/configuration/options/ for migration details.',
    );
  }

  merged.watch.backend = "chokidar";
  merged.watch.sources = normalizeWatchSources(merged.watch);
  if (merged.watch.sources.length === 0) {
    merged.watch.sources = getDefaultWatchSources(merged);
  }
}

/**
 *
 * @param {object} root0
 * @param {string} root0.src
 * @param {boolean} [root0.defer]
 * @param {boolean} [root0.async]
 * @param {string} [root0.type]
 * @param {string} [root0.position]
 * @returns {object}
 */
function getJsFileObject({ src, defer, async, type, position = "head" }) {
  return {
    src,
    defer,
    async,
    type,
    position,
  };
}

/**
 * @param {string|Array|object} strOrArrOrObj - user assets files, either one file as string, an array of files or an object with strings or array for each NODE_ENV
 * @param {object} manifest - manifest object
 * @param {string} [manifest.file] - manifest file path
 * @param {object} [manifest.content] - parsed json content of manifest file
 * @param {string} root
 * @returns {string[]} converts the given object to an array of asset file path strings
 */
function getJsFilesArray(strOrArrOrObj, manifest, root) {
  if (!Array.isArray(strOrArrOrObj)) {
    log("warn", "config.assets.js is not an array.");
    return [];
  }

  let files = strOrArrOrObj.map((entry) =>
    typeof entry === "string" ? getJsFileObject({ src: entry }) : entry,
  );

  if (files.length > 0 && manifest.file && manifest.content) {
    files = files.map((file) => {
      const manifestEntry = getPathFromManifest(file.src, manifest, root);

      if (manifestEntry) {
        return {
          ...file,
          src: path.join(path.dirname(manifest.file), manifestEntry),
        };
      } else {
        return file;
      }
    });
  }

  return files
    .filter((file) => typeof file.src === "string")
    .map((file) => ({
      ...file,
      src: sanitizePath(file.src),
    }));
}

/**
 * @param {string|Array|object} strOrArrOrObj - user assets files, either one file as string, an array of files or an object with strings or array for each NODE_ENV
 * @param {object} manifest - manifest object
 * @param {string|null} [manifest.file] - manifest file path
 * @param {object} [manifest.content] - parsed json content of manifest file
 * @param {string} root
 * @returns {string[]} converts the given object to an array of asset file path strings
 */
function getCssFilesArray(strOrArrOrObj, manifest, root) {
  if (!Array.isArray(strOrArrOrObj)) {
    log("warn", "config.assets.css is not an array.");
    return [];
  }

  let files = strOrArrOrObj.filter((entry) => typeof entry === "string");

  if (files.length > 0 && manifest.content && manifest.file) {
    files = files.map((file) => {
      const manifestEntry = getPathFromManifest(file, manifest, root);

      if (manifestEntry) {
        return path.join(path.dirname(manifest.file), manifestEntry);
      } else {
        return file;
      }
    });
  }

  return files.map(sanitizePath);
}

/**
 * @param {string|Array|object} strOrArrOrObj
 * @returns {string[]} the given param converted to an array of asset file path strings
 */
function getAssetFoldersArray(strOrArrOrObj) {
  if (!Array.isArray(strOrArrOrObj)) {
    log("warn", "config.assets.folder is not an array.");
    return [];
  }

  return strOrArrOrObj
    .filter((entry) => typeof entry === "string")
    .map(sanitizePath);
}

/**
 * @param {object} [userConfig] the unmerged user configuration
 * @returns {object} the user configuration merged with the default configuration
 */
export default (userConfig = {}) => {
  const config = applyExtensionConfig({ ...userConfig });

  if (config.build) {
    if (config.build.basePath) {
      if (!config.build.basePath.startsWith("/")) {
        config.build.basePath = `/${config.build.basePath}`;
      }

      if (!config.build.basePath.endsWith("/")) {
        config.build.basePath = `${config.build.basePath}/`;
      }
    }
  }

  if (config.assets) {
    let manifest = {};

    if (config.assets.manifest) {
      try {
        const manifestContent = fs.readFileSync(
          path.resolve(
            path.join(config.assets.root || "", config.assets.manifest),
          ),
          { encoding: "utf8" },
        );

        manifest.file = config.assets.manifest;
        manifest.content = JSON.parse(manifestContent);

        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        log(
          "warn",
          t("manifestNotFound").replace("{{manifest}}", config.assets.manifest),
        );
      }
    }

    if (config.assets.folder) {
      config.assets.folder = getAssetFoldersArray(config.assets.folder);
    }

    if (config.assets.css) {
      config.assets.css = getCssFilesArray(
        config.assets.css,
        manifest,
        config.assets.root,
      );
    }

    if (config.assets.js) {
      config.assets.js = getJsFilesArray(
        config.assets.js,
        manifest,
        config.assets.root,
      );
    }

    if (config.assets.shared) {
      if (config.assets.shared.css) {
        config.assets.shared.css = getCssFilesArray(
          config.assets.shared.css,
          manifest,
          config.assets.root,
        );
      }
      if (config.assets.shared.js) {
        config.assets.shared.js = getJsFilesArray(
          config.assets.shared.js,
          manifest,
          config.assets.root,
        );
      }
    }

    if (!config.assets.customProperties) {
      config.assets.customProperties = {};
    }

    if (Array.isArray(config.assets.customProperties.files)) {
      config.assets.customProperties.files =
        config.assets.customProperties.files.filter(
          (entry) => typeof entry === "string",
        );

      if (manifest?.content) {
        config.assets.customProperties.files =
          config.assets.customProperties.files.map((file) => {
            const manifestEntry = getPathFromManifest(
              file,
              manifest,
              config.assets.root,
            );

            if (manifestEntry) {
              return path.join(path.dirname(manifest.file), manifestEntry);
            } else {
              return file;
            }
          });
      }
    } else {
      log("warn", "config.assets.customProperties.files is not an array.");

      config.assets.customProperties.files = [];
    }
  }

  if (config.components) {
    if (config.components.ignores) {
      config.components.ignores = arrayfy(config.components.ignores).map(
        sanitizePath,
      );
    }

    if (config.components.hidden) {
      config.components.hidden = arrayfy(config.components.hidden).map(
        sanitizePath,
      );
    }
  }

  if (!config.ui) config.ui = {};
  if (!config.ui.theme) config.ui.theme = {};
  if (!config.ui.theme.light) config.ui.theme.light = {};
  if (!config.ui.theme.dark) config.ui.theme.dark = {};

  if (config.ui.theme.logo) {
    if (typeof config.ui.theme.logo === "string") {
      const { logo } = config.ui.theme;

      config.ui.theme.logo = {
        light: logo,
        dark: logo,
      };
    } else {
      if (config.ui.theme.logo.light && !config.ui.theme.logo.dark) {
        config.ui.theme.logo.dark = config.ui.theme.logo.light;
      } else if (config.ui.theme.logo.dark && !config.ui.theme.logo.light) {
        config.ui.theme.logo.light = config.ui.theme.logo.dark;
      }
    }

    if (config.ui.theme.logo.light) {
      config.ui.theme.logo.light = sanitizePath(config.ui.theme.logo.light);
    }
    if (config.ui.theme.logo.dark) {
      config.ui.theme.logo.dark = sanitizePath(config.ui.theme.logo.dark);
    }
  }

  const merged = deepMerge(defaultUserConfig, config);

  merged.components.folder = sanitizePath(merged.components.folder);

  // do this later as otherwise the deepMerge would do concatenation which we do not want
  if (config.files) {
    if (config.files.mocks) {
      if (config.files.mocks.extension) {
        merged.files.mocks.extension = arrayfy(config.files.mocks.extension);

        if (merged.files.mocks.extension.length === 1) {
          merged.files.mocks.extension.push(
            defaultUserConfig.files.mocks.extension[1],
          );
        }
      }
    }
  }

  if (!langAvailable.includes(merged.ui.lang)) {
    merged.ui.lang = "en";
  }

  if (!Object.values(LINT_LOG_LEVELS).includes(merged.lint.logLevel)) {
    log(
      "warn",
      `Invalid config.lint.logLevel "${merged.lint.logLevel}". Falling back to "${defaultUserConfig.lint.logLevel}".`,
    );
    merged.lint.logLevel = defaultUserConfig.lint.logLevel;
  }

  applyLegacyWatchCompatibility(merged, config);
  normalizeAndValidateWatchConfig(merged);

  return merged;
};

/**
 * @param {string} file
 * @param {object} manifest
 * @param {string} root
 * @returns {string|null}
 */
function getPathFromManifest(file, manifest, root = "") {
  const entry = Object.entries(manifest.content).find(([key]) => {
    return (
      path.resolve(root, path.dirname(manifest.file), sanitizePath(key)) ===
      path.resolve(root, sanitizePath(file))
    );
  });

  return entry ? entry[1] : null;
}
