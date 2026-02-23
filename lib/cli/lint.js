import path from "path";
import init from "./app.js";
import getConfig from "../config.js";
import log from "../logger.js";
import { getComponentData } from "../mocks/index.js";
import validateMockData from "../validator/mocks.js";
import {
	getSchemaValidationMode,
	toSchemaValidationResult,
	validateSchemas,
} from "../validator/schemas.js";
import { t } from "../i18n/index.js";

/**
 * @param {object} args
 */
export default async function lint(args) {
	process.env.NODE_ENV = "development";

	const componentArg = args._.slice(1)[0];
	const config = await getConfig(args);
	process.env.MIYAGI_LOG_CONTEXT = "lint";
	process.env.MIYAGI_LOG_LEVEL = config.lint?.logLevel || "error";
	global.app = await init(config);

	if (componentArg) {
		const component = global.state.routes.find(
			({ alias }) =>
				alias === path.relative(config.components.folder, componentArg),
		);

		if (component) {
			const schemaValidation = validateSchemas({
				components: [component],
			});

			if (schemaValidation.errors.length > 0) {
				reportSchemaErrors(schemaValidation.errors);
				process.exit(1);
			}

			log("success", "All schemas valid.");

			await validateComponentMockData({
				component,
				validSchemas: schemaValidation.validSchemas,
			});
		} else {
			log("error", `The component ${componentArg} does not seem to exist.`);
			process.exit(1);
		}
	} else {
		await validateAllMockData();
	}
}

/**
 * @param {boolean} exitProcess
 */
async function validateAllMockData(exitProcess = true) {
	log("info", t("linter.all.start"));
	const mode = getSchemaValidationMode();
	const components = global.state.routes.filter(
		(route) => route.type === "components" && route.paths.tpl,
	);
	const schemaValidation = validateSchemas({
		components,
	});
	const invalidSchemaComponents = new Set(
		schemaValidation.errors.map((entry) => entry.component),
	);

	if (schemaValidation.errors.length === 0) {
		log("success", "All schemas valid.");
	}

	if (schemaValidation.errors.length > 0 && mode === "fail-fast") {
		reportSchemaErrors(schemaValidation.errors);
		log(
			"error",
			schemaValidation.errors.length === 1
				? t("linter.all.schema.invalid.one")
				: t("linter.all.schema.invalid.other").replace(
						"{{amount}}",
						schemaValidation.errors.length,
					),
		);
		if (exitProcess) {
			process.exit(1);
		}
		return;
	}

	const results = await Promise.all(
		components
			.filter((route) => !invalidSchemaComponents.has(route.paths.dir.short))
			.map((component) =>
				validateComponentMockData({
					component,
					silent: true,
					exitProcess: false,
					validSchemas: schemaValidation.validSchemas,
				}),
			),
	);
	const mockInvalidResults = results.filter(
		(result) => result?.valid === false && result.type === "mocks",
	);

	if (mode === "collect-all" && schemaValidation.errors.length > 0) {
		reportSchemaErrors(schemaValidation.errors);
		log(
			"error",
			schemaValidation.errors.length === 1
				? t("linter.all.schema.invalid.one")
				: t("linter.all.schema.invalid.other").replace(
						"{{amount}}",
						schemaValidation.errors.length,
					),
		);
	}

	if (mockInvalidResults.length > 0) {
		log(
			"error",
			mockInvalidResults.length === 1
				? t("linter.all.mocks.invalid.one")
				: t("linter.all.mocks.invalid.other").replace(
						"{{amount}}",
						mockInvalidResults.length,
					),
		);
	}

	if (mockInvalidResults.length === 0 && schemaValidation.errors.length === 0) {
		log("success", t("linter.all.valid"));
		if (exitProcess) {
			process.exit(0);
		}
		return;
	}

	if (exitProcess) {
		process.exit(1);
	}
}

/**
 * @param {object} obj
 * @param {object} obj.component
 * @param {boolean} [obj.silent]
 * @param {boolean} [obj.exitProcess]
 * @param {Array<object>} [obj.validSchemas]
 * @returns {Promise<object|null>}
 */
async function validateComponentMockData({
	component,
	silent,
	exitProcess = true,
	validSchemas = [],
}) {
	if (!silent) {
		log(
			"info",
			t("linter.component.start").replace(
				"{{component}}",
				component.paths.dir.short,
			),
		);
	}

	const data = (await getComponentData(component)) || [];

	if (data.length > 0) {
		for (const { messages = [] } of data) {
			for (const { type, text, verbose } of messages) {
				log(type, text, verbose);
			}
		}
	}

	const results = validateMockData(component, data, false, validSchemas);

	if (!results) return null;

	if (results.length === 0) {
		if (!silent) {
			log("success", t("linter.component.valid"));
		}

		if (exitProcess) {
			process.exit(0);
		}

		return {
			valid: true,
		};
	}

	if (exitProcess) {
		process.exit(1);
	}

	return {
		valid: false,
		type: results[0].type,
	};
}

/**
 * @param {Array<object>} schemaErrors
 */
function reportSchemaErrors(schemaErrors) {
	schemaErrors.forEach((entry) => {
		const result = toSchemaValidationResult(entry);
		log("error", `${entry.component}:\n${result.data[0].message}`);
		log("error", `schema: ${entry.schemaFile}`);
		if (entry.schemaPath || entry.instancePath) {
			log(
				"error",
				`schemaPath: ${entry.schemaPath || "-"} | instancePath: ${entry.instancePath || "-"}`,
			);
		}
		if (entry.hint) {
			log("warn", entry.hint);
		}
	});
}
