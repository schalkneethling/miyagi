---
title: "Validating HTML"
---

_miyagi_ can validate the rendered HTML of your components to catch issues like unclosed tags, duplicate attributes, or accessibility problems.

## Render mode

Validate all components by rendering them on-the-fly:

```bash
miyagi validate-html
```

Validate a single component:

```bash
miyagi validate-html path/to/component
```

In render mode, _miyagi_ renders each component variation using its mock data, then validates the resulting HTML fragment.

## Files mode

Validate pre-existing HTML files (e.g. from a static build) using a glob pattern:

```bash
miyagi validate-html --files "build/miyagi/component-templates-*-variation!(*-embedded).html"
```

This is useful in CI pipelines where you have already generated a static build and want to validate the output without re-rendering.

In files mode, _miyagi_ validates each file as a full HTML document (including `<!DOCTYPE html>`, `<html>`, `<head>`, etc.).

## Options

### `--files`, `-f`

Glob pattern pointing to HTML files to validate. When provided, _miyagi_ uses files mode instead of render mode.

### `--output`, `-o`

Path for the Markdown report file. Defaults to `html-validation-report.md`.

```bash
miyagi validate-html --output reports/html-report.md
```

### `--verbose`, `-v`

Enable additional logging.

## Configuration

You can configure HTML validation in your `.miyagi.js` or `.miyagi.mjs`:

```js
export default {
  htmlValidation: {
    output: "html-validation-report.md",
    htmlValidateConfig: {
      extends: ["html-validate:recommended"],
      rules: {
        "doctype-style": "off",
        "missing-doctype": "off",
        "no-missing-references": "off",
      },
    },
  },
};
```

The `htmlValidateConfig` object is passed directly to [html-validate](https://html-validate.org/). You can use any configuration options supported by the library, including custom rules and presets.

## Report format

The command generates a Markdown report containing:

1. A summary with total component counts, pass/fail status, and error/warning totals
2. A table listing every component with its status
3. Detailed error tables for each failed component and variation, including line numbers, column numbers, rule IDs, and messages

## CI usage

The command exits with code `4` when validation errors are found and `0` when all HTML is valid, making it suitable for CI pipelines:

```bash
miyagi validate-html || exit 1
```

Or validate build output:

```bash
miyagi build
miyagi validate-html --files "build/miyagi/component-templates-*-variation!(*-embedded).html"
```

## Exit codes

- `0` — all HTML is valid
- `2` — CLI usage error (e.g. component not found)
- `4` — validation errors found
