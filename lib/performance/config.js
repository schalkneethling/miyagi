// @ts-check

import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import schema from "./schema.json" with { type: "json" };

export const CONFIG_FILE_NAME = "miyagi.performance.json";

const DEFAULTS = {
  compression: "gzip",
  warnRatio: 0.8,
};

let validator = null;

/**
 * @returns {Function} compiled AJV validator (cached across calls)
 */
function getValidator() {
  if (!validator) {
    const ajv = new Ajv({ allErrors: true });
    validator = ajv.compile(schema);
  }
  return validator;
}

/**
 * @param {{cwd?: string}} [options]
 * @returns {object|null}
 */
export function loadPerformanceConfig({ cwd } = {}) {
  const baseDir = cwd ?? process.cwd();
  const file = path.join(baseDir, CONFIG_FILE_NAME);

  let raw;
  try {
    raw = readFileSync(file, "utf-8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse ${CONFIG_FILE_NAME}: invalid JSON (${error.message}).`,
      { cause: error },
    );
  }

  const validate = getValidator();
  if (!validate(parsed)) {
    const message = (validate.errors || [])
      .map((err) => `${err.instancePath || "/"} ${err.message}`)
      .join("; ");
    throw new Error(`Invalid ${CONFIG_FILE_NAME}: ${message}.`);
  }

  return {
    compression: parsed.compression ?? DEFAULTS.compression,
    warnRatio: parsed.warnRatio ?? DEFAULTS.warnRatio,
    components: parsed.components ?? {},
    pages: parsed.pages ?? {},
  };
}
