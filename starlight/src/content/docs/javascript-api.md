---
title: "JavaScript API"
---

## Methods

### `getMockData`

Returns the resolved mock data as a plain JSON object.

#### Options

```js
{
 component: String, // Required — Path to the component directory, relative from config.components.folder.
 variant: String // Optional — Variant name. If omitted, the default variant is used.
}
```

#### Response

```js
Promise<{
 success: Boolean,
 data: null|Object|Array, // The resolved mock data
 message: String // Optional — Error message in case that no mock data could be returned
}>
```

### `getHtml`

Returns the rendered variant as a string of HTML.

#### Options

```js
{
 component: String, // Required — Path to the component directory, relative from config.components.folder.
 variant: String // Optional — Variant name. If omitted, the default variant is used.
}
```

#### Response

```js
Promise<{
 success: Boolean,
 data: null|String, // Optional — The HTML string
 message: String // Optional — Error message in case that no HTML could be returned
}>
```

### `createMockData`

Creates a mock data file based on the components schema file, same as the CLI command.

#### Options

```js
{
  component: String; // Required — Path to the component directory, relative from config.components.folder.
}
```

#### Response

```js
Promise<{
 success: Boolean,
 message: String // Optional — Error message in case that the mock data could not be created
}>
```

### `createBuild`

Simply triggers a build, same as the CLI command.

#### Options

_None_

#### Response

```js
Promise<{
 success: Boolean,
 message: String
}>
```

### `createComponent`

Creates component files for a given path.

#### Options

```js
{
 component: String, // Required — Path to component directory.
 only: String[] // Optional — Values can be any of "tpl", "css", "js", "mocks", "schema", "docs". If omitted, all files are created.
 skip: String[] // Optional — Values can be any of "tpl", "css", "js", "mocks", "schema", "docs". If omitted, all files are created.
}
```

Please note that only either `only` or `skip` should be passed. If both are passed, `only` is used and `skip` is ignored.

#### Response

```js
Promise<{
 success: Boolean,
 message: String
}>
```

### `lintComponent`

Validates the schema and mock data for a single component.

#### Options

```js
{
  component: String; // Required — Path to component directory.
}
```

#### Response

```js
Promise<{
 success: Boolean, // only indicates if linting in general was successful for not, not if there are errors or not
 data: [{
  type: String, // Any of "mocks", "schema", "schema-ref"
  data: [{
   message: String
  }]
 }],
 message: String // Optional — Error message in case success was false
}>
```

Example `schema-ref` error (unresolved `$ref` in schema):

```js
{
  success: false,
  data: [{
    type: "schema-ref",
    data: [{ message: "can't resolve reference ...", component: "my-component", schemaFile: "/path/to/schema.json" }]
  }]
}
```

### `lintComponents`

Validates the schema and mock data for all components.

#### Options

_None_

#### Response

```js
Promise<{
 success: Boolean, // only indicates if linting in general was successful for not, not if there are errors or not
 data: [{
  component: String, // Path to component directory.
  errors: [{
   type: String, // Any of "mocks", "schema", "schema-ref"
   data: [{
    message: String
   }]
  }]
 }],
 message: String // Optional — Error message in case success was false
}>
```

### `validateHtml`

Validates the rendered HTML for all components and returns the results along with a Markdown report.

#### Options

```js
{
  htmlValidateConfig: Object // Optional — html-validate configuration override
}
```

#### Response

```js
Promise<{
 success: Boolean, // true if all components pass validation
 data: {
  results: {
   components: [{
    component: String, // Component path
    variations: [{
     name: String, // Variation name
     valid: Boolean,
     messages: [{
      severity: Number, // 1=warning, 2=error
      message: String,
      ruleId: String,
      line: Number,
      column: Number
     }]
    }]
   }],
   summary: {
    total: Number,
    passed: Number,
    failed: Number,
    errors: Number,
    warnings: Number
   }
  },
  report: String // Markdown-formatted report
 }
}>
```

### `validateHtmlComponent`

Validates the rendered HTML for a single component (all variations).

#### Options

```js
{
  component: String, // Required — Path to the component directory, relative from config.components.folder.
  htmlValidateConfig: Object // Optional — html-validate configuration override
}
```

#### Response

```js
Promise<{
 success: Boolean, // true if all variations pass validation
 data: {
  component: String,
  variations: [{
   name: String,
   valid: Boolean,
   messages: [{
    severity: Number,
    message: String,
    ruleId: String,
    line: Number,
    column: Number
   }]
  }]
 },
 message: String // Optional — Error message if component not found
}>
```

### Performance

The opt-in performance feature is consumed via the `miyagi perf` CLI or the dev-server's `/api/performance/*` endpoints. There is no programmatic JavaScript API export — see [Performance](/cli-commands/performance-budget/) for full details.

## Usage

```js
import { getMockData } from "@schalkneethling/miyagi-core/api";

await getMockData({ … });
```
