import path from "path";
import {
	createSynchronousEnvironment,
	createSynchronousFilesystemLoader,
} from "twing";
import fs from "fs";
import { t } from "../i18n/index.js";
import log from "../logger.js";
import * as helpers from "../helpers.js";
import { EXIT_CODES, MiyagiError } from "../errors.js";
import TwingCache from "./twing/cache.js";
import * as twingFunctions from "./twing/functions.js";

/**
 * @returns {void}
 */
function setMiyagiEngine() {
	const loader = createSynchronousFilesystemLoader(fs);
	const twing = createSynchronousEnvironment(loader, {
		cache: new TwingCache(),
	});

	loader.addPath(
		path.join(import.meta.dirname, "../../frontend/views"),
		"@miyagi",
	);

	Object.values(twingFunctions).forEach((twingFunction) => {
		twing.addFunction(twingFunction);
	});

	global.app.engine("miyagi", async (str, options, cb) =>
		cb(await twing.render(str, options)),
	);
}

/**
 * @returns {Promise<void>}
 */
async function setUserEngine() {
	const { extension } = global.config.files.templates;
	const { engine } = global.config;

	if (!engine.render) {
		const message = "No render function has beend defined.";
		log("error", message);
		throw new MiyagiError(message, {
			code: EXIT_CODES.CONFIG_ERROR,
			logged: true,
		});
	}

	try {
		global.app.engine(
			helpers.getSingleFileExtension(extension),
			async (name, context, cb) => await engine.render({ name, context, cb }),
		);
	} catch (e) {
		const message = t("settingEngineFailed");
		log("error", message, e);
		throw new MiyagiError(message, {
			code: EXIT_CODES.CONFIG_ERROR,
			logged: true,
		});
	}
}

/**
 * @returns {Promise<void>}
 */
export default async function initEngines() {
	await setUserEngine();
	setMiyagiEngine();
}
