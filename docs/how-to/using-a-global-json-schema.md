# Using a global JSON Schema

In your component directory (defined via `components.folder`) you can create a global JSON Schema.
The file name needs to be the same as your component JSON Schema files (defined via `files.schema`, default: `schema.json`).

The content of the file needs to be an array of JSON Schema definition objects. That allows you to define multiple global JSON Schema definitions in a single file.

## Purpose

A global schema lets you define reusable type definitions — enums, shared property shapes, string patterns — once and reference them from any component schema using `$ref`. This avoids duplicating definitions across component schemas.

## File location

Place the file directly in the root of your components folder, not inside a component subdirectory:

```text
src/components/
├── schema.json        ← global schema (array of definitions)
├── button/
│   └── schema.json    ← component schema, may $ref global defs
└── card/
    └── schema.json
```

## File format

The file must contain a JSON (or YAML) array. Each element is a separate JSON Schema definition. Every definition **must** have a unique `$id` so that component schemas can reference it by that identifier.

### JSON example

```json
[
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://example.com/schemas/SpacingSize",
    "type": "string",
    "enum": ["xs", "s", "m", "l", "xl"]
  },
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://example.com/schemas/ColorToken",
    "type": "string",
    "pattern": "^color-"
  }
]
```

### YAML example

```yaml
- $schema: "http://json-schema.org/draft-07/schema#"
  $id: "https://example.com/schemas/SpacingSize"
  type: string
  enum:
    - xs
    - s
    - m
    - l
    - xl

- $schema: "http://json-schema.org/draft-07/schema#"
  $id: "https://example.com/schemas/ColorToken"
  type: string
  pattern: "^color-"
```

## Referencing global definitions from a component schema

Use `$ref` with the `$id` value of the global definition:

```yaml
$schema: "http://json-schema.org/draft-07/schema#"
$id: "https://example.com/schemas/card"
type: object
properties:
  spacing:
    $ref: "https://example.com/schemas/SpacingSize"
  borderColor:
    $ref: "https://example.com/schemas/ColorToken"
```

After the references are resolved, the effective schema used for validation is:

```yaml
type: object
properties:
  spacing:
    type: string
    enum:
      - xs
      - s
      - m
      - l
      - xl
  borderColor:
    type: string
    pattern: "^color-"
```

## How it works

Before miyagi compiles component schemas, it reads the global schema file, registers every definition with the JSON Schema validator (AJV), and makes them available for `$ref` resolution. This happens for both full-project linting (`miyagi lint`) and single-component linting (`miyagi lint path/to/component`).

## Error behavior

| Situation                                 | What miyagi reports                                                  |
| ----------------------------------------- | -------------------------------------------------------------------- |
| Global schema file is missing             | No error — global schema is optional                                 |
| Global schema is not an array             | The single object is treated as a one-element array                  |
| A definition is missing `$id`             | A fallback `$id` (`miyagi-global:<index>`) is assigned automatically |
| A definition has an invalid schema        | Reported as a schema error with component `$global`                  |
| Two definitions share the same `$id`      | Reported as a schema error with component `$global`                  |
| Component `$ref` targets an unknown `$id` | Reported as a `schema-ref` error on that component                   |
