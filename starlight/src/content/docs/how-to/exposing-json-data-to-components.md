---
title: "Exposing JSON data to components"
---

Some components need JSON data available to their JavaScript at runtime — configuration, state, or the same data that drives the template. The `data.json` file lets you opt in to this on a per-component basis.

## When to use `useMocks: true`

Use this when your component's JavaScript needs the **same data that the template receives**. For example, a chart component where the template renders labels and headings, but JavaScript draws the chart using the full dataset.

Create a `data.json` in the component folder:

```json
{
  "useMocks": true
}
```

_miyagi_ will resolve the component's mock data through its full pipeline (including `$ref` and `$tpl` resolution) and expose the result as JSON in the DOM. When viewing a specific variation, the variation's resolved data is used.

## When to use custom JSON

Use this when your component needs data that **doesn't map to mock data** — API endpoints, feature flags, i18n strings for JavaScript, or any bespoke configuration.

Create a `data.json` with the data you want to expose:

```json
{
  "apiEndpoint": "/api/suggestions",
  "debounceMs": 300,
  "minQueryLength": 3
}
```

This JSON is exposed as-is (the `useMocks` key is stripped if present, but no other processing is applied).

## Reading the data

The JSON is injected as a `<script type="application/json" id="miyagi-mock-data">` tag in the `<head>` of the component's rendered HTML. Read it in your component's JavaScript:

```js
const el = document.getElementById("miyagi-mock-data");

if (el) {
  const config = JSON.parse(el.textContent);
  initAutocomplete(config);
}
```

## When data is exposed

The JSON is only exposed when the component is the **primary subject** of the view:

- Viewing the component overview page
- Viewing a specific variation
- Opening the component in a new tab (standalone page)

When the component is included as a partial within a larger template or another component, its `data.json` is **not** consulted. This keeps the feature predictable and avoids unintended side effects in composed views.

## Component folder structure

A component using `data.json` might look like this:

```
button/
  index.twig
  mocks.json
  schema.json
  data.json        ← opt-in JSON exposure
  index.css
  index.js
```

The `data.json` file is completely optional. Components without it behave exactly as before — no JSON is exposed in the DOM.
