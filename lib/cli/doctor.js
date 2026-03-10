import { stat } from "node:fs/promises";
import path from "node:path";
import log from "../logger.js";
import { EXIT_CODES } from "../errors.js";
import pkgJson from "../../package.json" with { type: "json" };

const CONFIG_FILES = [".miyagi.js", ".miyagi.mjs"];

/**
 * @returns {Promise<object>}
 */
export default async function doctor() {
  let success = true;

  if (checkNodeVersion()) {
    log(
      "success",
      `Node.js ${process.versions.node} satisfies ${pkgJson.engines.node}.`,
    );
  } else {
    success = false;
    log(
      "error",
      `Node.js ${process.versions.node} does not satisfy ${pkgJson.engines.node}.`,
    );
  }

  const configResult = await loadUserConfig();

  if (!configResult.userFileName) {
    success = false;
    log(
      "error",
      "No miyagi config found. Create .miyagi.js or .miyagi.mjs in your project root.",
    );
    return {
      success,
      code: EXIT_CODES.CONFIG_ERROR,
      shouldExit: true,
    };
  }

  if (configResult.error) {
    success = false;
    log(
      "error",
      `Could not parse ${configResult.userFileName}. Check its syntax and exports.`,
    );
    log("error", configResult.error.message, configResult.error);
    return {
      success,
      code: EXIT_CODES.CONFIG_ERROR,
      shouldExit: true,
    };
  }

  log("success", `Loaded config from ${configResult.userFileName}.`);

  const config = configResult.config || {};

  if (typeof config.engine?.render === "function") {
    log("success", "engine.render is defined.");
  } else {
    success = false;
    log("error", "engine.render is missing.");
  }

  if (config.components?.folder || config.docs?.folder) {
    log("success", "At least one source folder is configured.");
  } else {
    success = false;
    log(
      "error",
      "Set at least one of components.folder or docs.folder in your miyagi config.",
    );
  }

  if (config.components?.folder) {
    if (await pathExists(config.components.folder)) {
      log("success", `components.folder exists: ${config.components.folder}`);
    } else {
      success = false;
      log(
        "error",
        `components.folder does not exist: ${config.components.folder}`,
      );
    }
  }

  if (config.docs?.folder) {
    if (await pathExists(config.docs.folder)) {
      log("success", `docs.folder exists: ${config.docs.folder}`);
    } else {
      success = false;
      log("error", `docs.folder does not exist: ${config.docs.folder}`);
    }
  }

  log(
    success ? "success" : "error",
    success ? "Doctor checks passed." : "Doctor found issues.",
  );

  return {
    success,
    code: success ? EXIT_CODES.SUCCESS : EXIT_CODES.CONFIG_ERROR,
    shouldExit: true,
  };
}

/**
 * @returns {boolean}
 */
function checkNodeVersion() {
  const minimumMajor = Number(pkgJson.engines.node.match(/\d+/)?.[0] || 0);
  const currentMajor = Number(process.versions.node.split(".")[0]);
  return currentMajor >= minimumMajor;
}

/**
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
async function pathExists(relativePath) {
  try {
    await stat(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<object>}
 */
async function loadUserConfig() {
  for (const fileName of CONFIG_FILES) {
    const fullPath = path.resolve(process.cwd(), fileName);

    if (!(await pathExists(fileName))) {
      continue;
    }

    try {
      const module = await import(`${fullPath}?time=${Date.now()}`);
      return {
        userFileName: fileName,
        config: module.default || {},
      };
    } catch (error) {
      return {
        userFileName: fileName,
        error: /** @type {Error} */ (error),
      };
    }
  }

  return {
    userFileName: null,
    config: null,
  };
}
