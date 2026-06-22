import deepMerge from "deepmerge";

/**
 * @returns {object} default extension options
 */
function getDefaultExtensionOptions() {
  return { locales: {} };
}

/**
 * @typedef {object} ExtensionEntry
 * @property {object} extension - The plugin or extension module.
 * @property {object} options - Options passed to the plugin.
 */

/**
 * @param {object|Array} entry
 * @returns {ExtensionEntry|null}
 */
export function normalizeExtensionEntry(entry) {
  if (!entry) {
    return null;
  }

  if (Array.isArray(entry)) {
    return {
      extension: entry[0],
      options: entry[1] || getDefaultExtensionOptions(),
    };
  }

  if (entry.plugin || entry.extension) {
    return {
      extension: entry.plugin || entry.extension,
      options: entry.options || getDefaultExtensionOptions(),
    };
  }

  return {
    extension: entry,
    options: getDefaultExtensionOptions(),
  };
}

/**
 * @param {Array} entries
 * @returns {ExtensionEntry[]}
 */
export function normalizeExtensions(entries = []) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map(normalizeExtensionEntry)
    .filter((entry) => entry?.extension && typeof entry.extension === "object");
}

/**
 * @param {object} config
 * @returns {object}
 */
export function applyExtensionConfig(config) {
  let nextConfig = {
    ...config,
    extensions: normalizeExtensions(config.extensions),
  };

  for (const { extension, options } of nextConfig.extensions) {
    if (typeof extension.configure !== "function") {
      continue;
    }

    const extensionConfig = extension.configure({
      config: nextConfig,
      options,
    });

    if (extensionConfig && typeof extensionConfig === "object") {
      nextConfig = deepMerge(nextConfig, extensionConfig);
    }
  }

  return nextConfig;
}
