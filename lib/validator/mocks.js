import jsYaml from "js-yaml";
import { existsSync } from "node:fs";
import deepMerge from "deepmerge";
import log from "../logger.js";
import { t } from "../i18n/index.js";

/**
 * Module for validating mock data against JSON schema
 * @module validatorSchema
 * @param {object} component
 * @param {Array} dataArray - an array with mock data
 * @param {boolean} [noCli]
 * @param {Array<object>} [validSchemas]
 * @returns {null|object[]} null if there is no schema or an array with booleans defining the validity of the entries in the data array
 */
export default function validateMockData(
	component,
	dataArray,
	noCli,
	validSchemas = [],
) {
	const componentSchema =
		global.state.fileContents[component.paths.schema.full];

	if (componentSchema) {
		const validity = [];
		let validate;
		let jsonSchemaValidator;

		try {
			jsonSchemaValidator = new global.config.schema.ajv(
				deepMerge(
					{
						allErrors: true,
					},
					global.config.schema.options || {},
				),
			);

			validSchemas.forEach((entry) => {
				// Preload only other validated schemas for cross-component $ref resolution.
				// The current component schema is compiled below and must not be added twice.
				if (entry?.schemaFile !== component.paths.schema.full && entry?.schema) {
					jsonSchemaValidator.addSchema(entry.schema);
				}
			});

			validate = jsonSchemaValidator.compile(componentSchema);
		} catch (e) {
			const message = e.toString();
			if (!noCli) {
				log("error", `${component.paths.dir.short}:\n${message}`, e);
			}
			return [
				{
					type: "schema",
					data: [{ message }],
				},
			];
		}

		if (validate && dataArray) {
			dataArray.forEach((entry) => {
				const valid = validate(entry?.resolved ?? {});
				if (!valid && !noCli) {
					validate.errors.forEach((error) => {
						log(
							"error",
							`${component.paths.dir.short} # ${entry.name}\n${jsYaml.dump(error)}`,
						);
					});
				}

				if (!valid) {
					validity.push({
						variant: entry.name,
						data: validate.errors,
					});
				}
			});
		}

		return validity.map((item) => ({
			type: "mocks",
			...item,
		}));
	}

	if (!global.config.isBuild && !noCli) {
		const parseError = global.state.fileReadErrors?.[component.paths.schema.full];
		const schemaExistsOnDisk = existsSync(component.paths.schema.full);
		const warningMessage = parseError
			? t("validator.mocks.schemaParseFailed")
					.replace("{{schemaFile}}", component.paths.schema.short)
					.replace("{{format}}", "JSON or YAML")
			: schemaExistsOnDisk
				? t("validator.mocks.schemaParseFailed")
						.replace("{{schemaFile}}", component.paths.schema.short)
						.replace("{{format}}", "JSON or YAML")
				: t("validator.mocks.schemaMissing")
						.replace("{{component}}", component.paths.dir.short)
						.replace("{{schemaFile}}", component.paths.schema.short);
		log(
			"warn",
			warningMessage,
		);
	}

	return null;
}
