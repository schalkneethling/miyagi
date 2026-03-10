// @ts-check

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import init from "../../../lib/index.js";
import {
	getSchemaValidationMode,
	toSchemaValidationResult,
	validateSchemas,
} from "../../../lib/validator/schemas.js";

beforeAll(() => (process.env.MIYAGI_JS_API = "true"));
afterAll(() => (process.env.MIYAGI_JS_API = "false"));

describe("validateSchemas", () => {
	test("returns all invalid schemas while still collecting valid schemas", async () => {
		global.app = await init("api");

		const result = validateSchemas();

		expect(result.valid).toBe(false);
		expect(result.errors.map((entry) => entry.component)).toStrictEqual([
			"icon",
			"image",
			"ref-missing",
		]);
		expect(result.validSchemas.some((entry) => entry.component === "button")).toBe(
			true,
		);
		expect(
			result.validSchemas.some((entry) => entry.component === "ref-consumer"),
		).toBe(true);
		expect(result.errors[0]).toEqual(
			expect.objectContaining({
				component: expect.any(String),
				schemaFile: expect.any(String),
				type: expect.any(String),
				message: expect.any(String),
			}),
		);
	});

	test("classifies unresolved refs as schema-ref", async () => {
		global.app = await init("api");

		const result = validateSchemas();
		const unresolvedRefError = result.errors.find(
			(entry) => entry.component === "ref-missing",
		);

		expect(unresolvedRefError).toEqual(
			expect.objectContaining({
				type: "schema-ref",
			}),
		);
	});

	test("registers global schema definitions so component $ref to global $id resolves", async () => {
		global.app = await init("api");

		const result = validateSchemas();

		expect(result.validSchemas.some((entry) => entry.component === "$global")).toBe(
			true,
		);
		expect(
			result.validSchemas.some(
				(entry) => entry.component === "ref-global-consumer",
			),
		).toBe(true);
		expect(
			result.errors.some((entry) => entry.component === "ref-global-consumer"),
		).toBe(false);
	});

	test("does not include global schema component in error list for valid global defs", async () => {
		global.app = await init("api");

		const result = validateSchemas();

		expect(
			result.errors.some((entry) => entry.component === "$global"),
		).toBe(false);
	});
});

describe("getSchemaValidationMode", () => {
	test("returns collect-all when mode is invalid", async () => {
		global.app = await init("api");
		global.config.schemaValidationMode = "invalid-mode";

		expect(getSchemaValidationMode()).toBe("collect-all");
	});
});

describe("toSchemaValidationResult", () => {
	test("maps schema errors to concise linter result shape by default", () => {
		expect(
			toSchemaValidationResult({
				type: "schema",
				component: "button",
				schemaFile: "schema.json",
				message: "Error: schema is invalid",
				schemaPath: "#/properties/type",
				instancePath: "/properties/label",
				hint: "Hint",
				details: [],
			}),
		).toStrictEqual({
			type: "schema",
			data: [
				{
					message: "Error: schema is invalid",
					component: "button",
					schemaFile: "schema.json",
					hint: "Hint",
				},
			],
		});
	});

	test("maps schema errors to verbose linter result shape when enabled", () => {
		expect(
			toSchemaValidationResult(
				{
					type: "schema-ref",
					component: "button",
					schemaFile: "schema.json",
					message: "Error: schema is invalid",
					schemaPath: "#/properties/type",
					instancePath: "/properties/label",
					hint: "Hint",
					details: [],
				},
				{ verbose: true },
			),
		).toStrictEqual({
			type: "schema-ref",
			data: [
				{
					message: "Error: schema is invalid",
					component: "button",
					schemaFile: "schema.json",
					schemaPath: "#/properties/type",
					instancePath: "/properties/label",
					hint: "Hint",
					details: [],
				},
			],
		});
	});
});
