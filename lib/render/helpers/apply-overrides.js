/**
 * Applies query-param override values to resolved component data.
 * Values are coerced to the appropriate type based on the JSON schema.
 * Only schema-defined properties are overridden; unknown keys are ignored.
 * @param {object} data - the resolved mock data object
 * @param {object} overrides - key/value overrides from req.query.overrides
 * @param {object} [schema] - the JSON schema for the component
 * @returns {object} a new object with overrides applied
 */
export default function applyOverrides(data, overrides, schema) {
  if (!overrides || typeof overrides !== "object") {
    return data;
  }

  const properties = schema?.properties ?? {};
  const coerced = {};

  for (const [key, value] of Object.entries(overrides)) {
    const propSchema = properties[key];
    if (!propSchema) continue;

    if (propSchema.type === "boolean") {
      coerced[key] = value === "true";
    } else if (
      Array.isArray(propSchema.enum) &&
      propSchema.enum.every((v) => typeof v === "number")
    ) {
      coerced[key] = Number(value);
    } else {
      coerced[key] = value;
    }
  }

  return { ...data, ...coerced };
}
