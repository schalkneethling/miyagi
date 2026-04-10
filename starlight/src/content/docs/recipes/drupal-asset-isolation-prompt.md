---
title: "AI agent prompt: Drupal component asset isolation"
---

The following prompt can be given to an AI coding agent to resolve and update `$assets` entries in miyagi component mock files based on a Drupal `*.libraries.yml` file.

## The prompt

Copy and adapt the prompt below for your project. Replace the placeholders (`<...>`) with your actual values.

---

**Prompt:**

> You are working in a project that uses miyagi as a component development tool. The component library lives inside a Drupal theme. Components are rendered in isolation and need explicit `$assets` declarations in their mock files to load the correct CSS and JS.
>
> **Your task:** Resolve each component's asset dependencies from the Drupal libraries file and update their mock files with the correct `$assets` entry.
>
> ### Project details
>
> - **Libraries file:** `<path/to/mytheme.libraries.yml>`
> - **Components folder:** `<path/to/components/>` (matches `components.folder` in `.miyagi.js`)
> - **Ignore dependency prefixes:** `core`, `drupal` (skip external Drupal dependencies)
> - **Mock file format:** `<json|yaml>` (e.g. `mocks.json` or `mocks.yaml`)
>
> ### How to proceed
>
> **Option A — Use the CLI (preferred if available):**
>
> Check if `miyagi drupal-assets` is available. If so:
>
> 1. Create or verify `.miyagi-assets.js` in the project root with:
>
>    ```js
>    export default {
>      engine: "drupal",
>      drupal: {
>        libraries: "<path/to/mytheme.libraries.yml>",
>        ignorePrefixes: ["core", "drupal"],
>        mapping: {
>          // Add entries for any library whose name doesn't match the component folder.
>          // Example: "element-info-message": "elements/info-message"
>        },
>        // Override if your library names use different prefixes for auto-discovery.
>        // autoDiscoveryPrefixes: ["block-", "widget-"],
>      },
>    };
>    ```
>
> 2. Run `miyagi drupal-assets --dry-run` first to preview changes.
> 3. If the output looks correct, run `miyagi drupal-assets` to apply.
>
> **Option B — Manual resolution:**
>
> If the CLI is not available:
>
> 1. Read the `*.libraries.yml` file.
> 2. For each component library entry:
>    a. Collect all CSS file paths from `css.<category>.<filepath>`.
>    b. Collect all JS file paths from `js.<filepath>`. If the entry has `attributes.type: module`, include `type: "module"` in the JS object.
>    c. Recursively resolve `dependencies` (format: `themename/libraryname`). Skip dependencies with ignored prefixes.
>    d. Order: dependency assets first, then the component's own assets.
> 3. Open the component's mock file and add/replace the `$assets` key:
>
>    ```json
>    {
>      "$assets": {
>        "css": ["dep.css", "component.css"],
>        "js": [{ "src": "component.js", "type": "module" }]
>      },
>      "existingKey": "existingValue"
>    }
>    ```
>
> 4. Do NOT modify any other keys in the mock file.
>
> ### Mapping libraries to component folders
>
> Match each library name to a component folder. Common patterns:
>
> - `element-info-message` → `elements/info-message/`
> - `pattern-card` → `patterns/card/`
>
> **IMPORTANT — When uncertain about a mapping:**
>
> - If you have access to an `AskQuestion` tool (or equivalent), ask the user to confirm the mapping before writing.
> - If you do NOT have an `AskQuestion` tool, default to `--dry-run` mode (Option A) or print the proposed changes without writing (Option B). Never guess a mapping and write to the wrong file.
>
> ### Validation
>
> After updating, spot-check a few components by running `miyagi start` and verifying:
>
> - The component renders with its expected styles.
> - Only the declared CSS/JS files appear in the iframe's `<head>` and `<body>`.
> - No console errors from unrelated scripts.

---

## Notes

- The prompt is designed to work with any AI coding agent (Cursor, Claude Code, Copilot, etc.).
- The `AskQuestion` safeguard prevents destructive writes when the agent can't confidently map a library to a component folder.
- Adapt the "Project details" section to match your actual project structure.
