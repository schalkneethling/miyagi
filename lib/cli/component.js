import generateComponent from "../generator/component.js";
import log from "../logger.js";
import appConfig from "../default-config.js";
import { t } from "../i18n/index.js";
import { EXIT_CODES } from "../errors.js";

/**
 * @param {object} cliParams
 * @returns {Promise<object>}
 */
export default async function createComponentViaCli(cliParams) {
  const commands = [cliParams.component].filter(Boolean);

  if (commands.length === 0) {
    const message = t("generator.noComponentNameDefined");
    log("error", message);
    return {
      success: false,
      code: EXIT_CODES.CLI_USAGE_ERROR,
      shouldExit: true,
      message,
    };
  }

  const [component] = commands;
  const fileTypes = getFileTypesFromCliArgs(
    cliParams,
    Object.values(appConfig.defaultUserConfig.files).map((file) => file.abbr),
  );

  try {
    const result = await generateComponent({ component, fileTypes });
    log("success", result);
    return {
      success: true,
      code: EXIT_CODES.SUCCESS,
      shouldExit: true,
      message: result,
    };
  } catch (message) {
    log("error", message);
    return {
      success: false,
      code: EXIT_CODES.GENERAL_ERROR,
      shouldExit: true,
      message: String(message),
    };
  }
}

/**
 * Returns an array with file names, if necessary filtered based on args
 * @param {object} args - the cli args
 * @param {Array} fileTypes
 * @returns {Array} all file paths that should be created
 */
function getFileTypesFromCliArgs(args, fileTypes) {
  if (args) {
    if (args.skip) {
      const files = [];
      for (const fileType of fileTypes) {
        if (!args.skip.includes(fileType)) {
          files.push(fileType);
        }
      }
      return files;
    }
    if (args.only) {
      return args.only;
    }
    return fileTypes;
  }
  return fileTypes;
}
