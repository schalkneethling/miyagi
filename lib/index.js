// @ts-check

/**
 * The miyagi module
 * @module index
 */

import { t } from "./i18n/index.js";
import log from "./logger.js";
import getConfig from "./config.js";
import { EXIT_CODES } from "./errors.js";
import apiApp from "../api/app.js";

/**
 * @param {object} config
 * @returns {Promise<object>}
 */
async function initApi(config) {
	return await apiApp(config);
}

/**
 * Requires the user config and initializes and calls correct modules based on command
 * @param {string} cmd
 * @param {object} [options]
 * @param {boolean} [options.isBuild]
 * @returns {Promise}
 */
export default async function Miyagi(cmd, { isBuild: isApiBuild } = {}) {
	if (cmd === "api") {
		process.env.NODE_ENV = "development";

		global.config = await getConfig(null, isApiBuild);

		return await initApi(global.config);
	}

	log("error", t("commandNotFound"));
	return {
		success: false,
		code: EXIT_CODES.CLI_USAGE_ERROR,
		shouldExit: true,
		message: t("commandNotFound"),
	};
}
