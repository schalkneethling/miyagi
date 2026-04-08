import { t } from "../i18n/index.js";
import initRendering from "../init/rendering.js";
import log from "../logger.js";
import mockGenerator from "../generator/mocks.js";
import getConfig from "../config.js";
import createCli from "../init/args.js";
import {
  lint,
  component as createComponentViaCli,
  drupalAssets,
  doctor,
  validateHtml as validateHtmlCli,
} from "./index.js";
import { EXIT_CODES, MiyagiError } from "../errors.js";

/**
 * @returns {object}
 */
function createSuccessResult() {
  return {
    success: true,
    code: EXIT_CODES.SUCCESS,
    shouldExit: true,
  };
}

/**
 * @param {string} message
 * @param {number} [code]
 * @returns {object}
 */
function createFailureResult(message, code = EXIT_CODES.GENERAL_ERROR) {
  log("error", message);
  return {
    success: false,
    code,
    shouldExit: true,
    message,
  };
}

/**
 * @param {number} code
 * @param {string[]} argv
 * @returns {void}
 */
function maybeLogDoctorHint(code, argv) {
  if (code !== EXIT_CODES.CONFIG_ERROR) {
    return;
  }

  if (argv.includes("doctor")) {
    return;
  }

  log("info", "Run `miyagi doctor` for a setup check.");
}

/**
 * @param {object} args
 * @param {boolean} [isBuild]
 * @param {boolean} [isComponentGenerator]
 * @returns {Promise<object>}
 */
async function loadCliConfig(
  args,
  isBuild = false,
  isComponentGenerator = false,
) {
  global.config = await getConfig(args, isBuild, isComponentGenerator);

  if (!global.config.components.folder && !global.config.docs.folder) {
    return createFailureResult(
      "Please specify at least either components.folder or docs.folder in your configuration file.",
      EXIT_CODES.CONFIG_ERROR,
    );
  }

  return {
    success: true,
    config: global.config,
  };
}

/**
 * @param {object} args
 * @returns {void}
 */
function applyCliEnv(args) {
  if (args.verbose) {
    process.env.VERBOSE = String(args.verbose);
  }
}

/**
 * @param {object} args
 * @param {object} [options]
 * @param {string} [options.defaultNodeEnv]
 * @param {string} [options.forcedNodeEnv]
 * @param {boolean} [options.isBuild]
 * @param {boolean} [options.isComponentGenerator]
 * @param {Function} run
 * @returns {Promise<object>}
 */
async function withCliConfig(args, options = {}, run) {
  applyCliEnv(args);

  if (options.forcedNodeEnv) {
    process.env.NODE_ENV = options.forcedNodeEnv;
  } else if (options.defaultNodeEnv && !process.env.NODE_ENV) {
    process.env.NODE_ENV = options.defaultNodeEnv;
  }

  const configResult = await loadCliConfig(
    args,
    options.isBuild,
    options.isComponentGenerator,
  );
  if (!configResult.success) {
    return configResult;
  }

  return await run(configResult.config);
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runStartCommand(args) {
  return await withCliConfig(
    args,
    { defaultNodeEnv: "development" },
    async (config) => {
      log(
        "info",
        t("serverStarting").replace("{{node_env}}", process.env.NODE_ENV),
      );

      return await initRendering(config);
    },
  );
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runBuildCommand(args) {
  return await withCliConfig(
    args,
    { forcedNodeEnv: "production", isBuild: true },
    async (config) => {
      log("info", t("buildStarting"));
      return await initRendering(config);
    },
  );
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runComponentCommand(args) {
  return await withCliConfig(
    args,
    { defaultNodeEnv: "development", isComponentGenerator: true },
    async () => {
      log("info", t("generator.starting"));
      return await createComponentViaCli(args);
    },
  );
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runMocksCommand(args) {
  return await withCliConfig(
    args,
    { defaultNodeEnv: "development" },
    async (config) => {
      const result = await mockGenerator(args.component, config.files);
      if (result?.message) {
        log(result.message.type, result.message.text, result.message.verbose);
      }

      return {
        success: result.success,
        code: result.success ? EXIT_CODES.SUCCESS : EXIT_CODES.GENERAL_ERROR,
        shouldExit: true,
        message: result.message?.text,
      };
    },
  );
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runLintCommand(args) {
  applyCliEnv(args);
  return await lint(args);
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runDrupalAssetsCommand(args) {
  return await withCliConfig(
    args,
    { forcedNodeEnv: "development" },
    async () => await drupalAssets(args),
  );
}

/**
 * @param {object} args
 * @returns {Promise<object>}
 */
async function runValidateHtmlCommand(args) {
  applyCliEnv(args);
  return await validateHtmlCli(args);
}

async function runDoctorCommand(args) {
  applyCliEnv(args);
  return await doctor(args);
}

/**
 * @param {Error|MiyagiError|string} error
 * @param {string[]} argv
 * @returns {object}
 */
function normalizeCliError(error, argv) {
  if (error instanceof MiyagiError) {
    if (!error.logged) {
      log("error", error.message);
    }
    maybeLogDoctorHint(error.code, argv);

    return {
      success: false,
      code: error.code,
      shouldExit: true,
      message: error.message,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  log("error", message);
  maybeLogDoctorHint(EXIT_CODES.GENERAL_ERROR, argv);
  return {
    success: false,
    code: EXIT_CODES.GENERAL_ERROR,
    shouldExit: true,
    message,
  };
}

/**
 * @param {string[]} [argv]
 * @returns {Promise<object>}
 */
export async function runCli(argv = process.argv) {
  const { cli, getResult } = createCli(
    {
      start: runStartCommand,
      build: runBuildCommand,
      new: runComponentCommand,
      mocks: runMocksCommand,
      lint: runLintCommand,
      validateHtml: runValidateHtmlCommand,
      drupalAssets: runDrupalAssetsCommand,
      doctor: runDoctorCommand,
    },
    argv,
  );

  try {
    await cli.parseAsync();
    const result = getResult() || createSuccessResult();
    maybeLogDoctorHint(result.code, argv);
    return result;
  } catch (error) {
    return normalizeCliError(error, argv);
  }
}
