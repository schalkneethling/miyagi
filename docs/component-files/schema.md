# Schema

**File:** `schema.json` or `schema.yaml`

You can use this file to define a [JSON schema](http://json-schema.org/) for your component.

When creating a new component via `miyagi new <component>`, the schema file is created with this content:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "required": [],
  "properties": {}
}
```

Your mock data will be validated against your schema. The result will be rendered on the [component view](/the-ui/#component) and logged in the console (if the validation failed).

## Cross-component `$ref`

You can reference a definition from another component schema using a `$ref` that targets its `$id`. miyagi registers all component schemas with the validator before compiling them, so cross-component references resolve automatically as long as the referenced schema has a `$id`.

**`button/schema.json`** — the schema being referenced:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/schemas/button",
  "type": "object",
  "properties": {
    "label": {
      "type": "string"
    }
  }
}
```

**`card/schema.json`** — references the button schema via its `$id`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/schemas/card",
  "type": "object",
  "properties": {
    "value": {
      "$ref": "https://example.com/schemas/button#/properties/label"
    }
  }
}
```

The `$ref` resolves inline, so the effective shape used for validation is:

```json
{
  "type": "object",
  "properties": {
    "value": {
      "type": "string"
    }
  }
}
```

The `$ref` is a pointer, not a copy — if `button/schema.json` changes the type of `label` later, card validation reflects that automatically.

> **Note:** The fragment must point to an actual schema node — a leaf like `#/properties/label`, a `$defs` entry, or the document root. Pointing to an intermediate structural object such as `#/properties` resolves to a plain object with no recognised JSON Schema keywords, so AJV silently treats it as `{}` and accepts any value. In strict mode (`strict: true` in `config.schema.options`) AJV throws an error instead.

## Global definitions

You can define shared type definitions — enums, patterns, reusable shapes — in a single global schema file placed in the root of your `components.folder`. Component schemas can then reference those definitions by `$id`.

See [Using a global JSON Schema](/how-to/using-a-global-json-schema/) for the full guide including file format, examples, and error behavior.
