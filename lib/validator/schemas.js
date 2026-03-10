// @ts-check

import path from "path";
import deepMerge from "deepmerge";

const DEFAULT_SCHEMA_VALIDATION_MODE = "collect-all";
const ALLOWED_SCHEMA_VALIDATION_MODES = new Set(["collect-all", "fail-fast"]);

/**
 * @returns {"collect-all"|"fail-fast"}
 */
export function getSchemaValidationMode() {
	const mode = global.config.schemaValidationMode ?? DEFAULT_SCHEMA_VALIDATION_MODE;

	if (!ALLOWED_SCHEMA_VALIDATION_MODES.has(mode)) {
		return DEFAULT_SCHEMA_VALIDATION_MODE;
	}

	return mode;
}

/**
 * Resolves global schema definitions from the root of the components folder.
 * The file must have the same name as configured in `files.schema` (JSON or YAML)
 * and contain an array of JSON Schema definition objects.
 * @returns {Array<{schema: object, globalSchemaFile: string}>}
 */
function loadGlobalSchemas() {
	const { components, files } = global.config;

	if (!components?.folder || !files?.schema) {
		return [];
	}

	const schemaFileName = `${files.schema.name}.${files.schema.extension}`;
	const globalSchemaFile = path.join(
		process.cwd(),
		components.folder,
		schemaFileName,
	);

	const content = global.state?.fileContents?.[globalSchemaFile];
	if (!content) {
		return [];
	}

	const defs = Array.isArray(content) ? content : [content];

	return defs
		.filter((def) => def && typeof def === "object")
		.map((schema) => ({ schema: structuredClone(schema), globalSchemaFile }));
}

/**
 * @param {object} options
 * @param {Array<object>} [options.components]
 * @returns {{ valid: boolean, errors: Array<object>, validSchemas: Array<object> }}
 */
export function validateSchemas({ components } = {}) {
	const validSchemas = [];
	const errors = [];
	const componentRoutes =
		components ??
		global.state.routes.filter((route) => route.type === "components" && route.paths.tpl);
	const validator = new global.config.schema.ajv(
		deepMerge(
			{
				allErrors: true,
			},
			global.config.schema.options || {},
		),
	);

	// Register global schema definitions before compiling component schemas so
	// that component $ref entries targeting global $id values can resolve.
	for (const [index, { schema, globalSchemaFile }] of loadGlobalSchemas().entries()) {
		if (!schema.$id) {
			schema.$id = `miyagi-global:${index}`;
		}
		try {
			validator.addSchema(schema);
			validSchemas.push({
				component: "$global",
				schemaFile: globalSchemaFile,
				schema,
			});
		} catch (error) {
			errors.push(
				buildSchemaValidationError({
					error,
					component: "$global",
					schemaFile: globalSchemaFile,
					rawSchema: schema,
				}),
			);
		}
	}

	let pendingSchemas = componentRoutes
		.map((component, index) => {
			// Absolute schema file path.
			const schemaFile = component.paths.schema.full;
			// Parsed schema from in-memory state cache.
			const schemaFromState = global.state.fileContents[schemaFile];

			if (!schemaFromState) {
				return null;
			}

			const schema = structuredClone(schemaFromState);
			if (!schema.$id) {
				schema.$id = component.paths.schema.short || schemaFile || index.toString();
			}

			return {
				component: component.paths.dir.short,
				schemaFile,
				rawSchema: schemaFromState,
				schema,
			};
		})
		.filter(Boolean);

	while (pendingSchemas.length > 0) {
		let progress = false;
		const retrySchemas = [];

		pendingSchemas.forEach((entry) => {
			try {
				validator.compile(entry.schema);
				if (!validator.getSchema(entry.schema.$id)) {
					validator.addSchema(entry.schema);
				}
				validSchemas.push({
					component: entry.component,
					schemaFile: entry.schemaFile,
					schema: entry.schema,
				});
				progress = true;
			} catch (error) {
				if (isUnresolvedRefError(error)) {
					retrySchemas.push(entry);
					return;
				}

				errors.push(
					buildSchemaValidationError({
						error,
						component: entry.component,
						schemaFile: entry.schemaFile,
						rawSchema: entry.rawSchema,
					}),
				);
			}
		});

		if (!progress) {
			retrySchemas.forEach((entry) => {
				const error = new Error(
					`can't resolve reference while validating schema ${entry.schemaFile}`,
				);
				errors.push(
					buildSchemaValidationError({
						error,
						component: entry.component,
						schemaFile: entry.schemaFile,
						rawSchema: entry.rawSchema,
					}),
				);
			});
			break;
		}

		pendingSchemas = retrySchemas;
	}

	return {
		valid: errors.length === 0,
		errors,
		validSchemas,
	};
}

/**
 * @param {object} obj
 * @param {Error & { errors?: Array<object> }} obj.error
 * @param {string} obj.component
 * @param {string} obj.schemaFile
 * @param {object} obj.rawSchema
 * @returns {object}
 */
function buildSchemaValidationError({ error, component, schemaFile, rawSchema }) {
	const ajvErrors = Array.isArray(error?.errors) ? error.errors : [];
	const [firstAjvError] = ajvErrors;
	const hint = getSchemaHint(rawSchema, ajvErrors);
	const type = isUnresolvedRefError(error) ? "schema-ref" : "schema";

	return {
		type,
		component,
		schemaFile,
		message: error?.toString?.() || "Unknown schema validation error",
		schemaPath: firstAjvError?.schemaPath || "",
		instancePath: firstAjvError?.instancePath || "",
		hint,
		details: ajvErrors.map((entry) => ({
			keyword: entry.keyword,
			message: entry.message,
			schemaPath: entry.schemaPath,
			instancePath: entry.instancePath,
			params: entry.params,
		})),
	};
}

/**
 * @param {object} schema
 * @param {Array<object>} ajvErrors
 * @returns {string|undefined}
 */
function getSchemaHint(schema, ajvErrors) {
	if (schema?.properties === null) {
		return "Hint: `properties` resolves to null. In YAML this often means `properties:` has no nested keys.";
	}

	if (
		ajvErrors.some(
			(error) =>
				error?.schemaPath?.endsWith("/properties/type") &&
				error?.instancePath?.includes("/properties/"),
		)
	) {
		return "Hint: check each field `type` value; it must be a valid JSON Schema type.";
	}

	return undefined;
}

/**
 * @param {Error & { message?: string, missingRef?: string, missingSchema?: string, code?: string }} error
 * @returns {boolean}
 */
function isUnresolvedRefError(error) {
	if (typeof error?.missingRef === "string" && error.missingRef.length > 0) {
		return true;
	}

	if (
		typeof error?.missingSchema === "string" &&
		error.missingSchema.length > 0
	) {
		return true;
	}

	if (error?.code === "ERR_MISSING_REF") {
		return true;
	}

	return /can't resolve reference|missing ref|missing schema/i.test(
		error?.message || "",
	);
}

/**
 * @param {object} schemaError
 * @param {object} [options]
 * @param {boolean} [options.verbose]
 * @returns {{ type: "schema"|"schema-ref", data: Array<object> }}
 */
export function toSchemaValidationResult(schemaError, options = {}) {
	const useVerbose =
		options.verbose ?? global.config?.schema?.verbose === true;
	const formattedError = {
		message: schemaError.message,
		component: schemaError.component,
		schemaFile: schemaError.schemaFile,
		hint: schemaError.hint,
	};

	if (useVerbose) {
		formattedError.schemaPath = schemaError.schemaPath;
		formattedError.instancePath = schemaError.instancePath;
		formattedError.details = schemaError.details;
	}

	return {
		type: schemaError.type || "schema",
		data: [
			formattedError,
		],
	};
}
