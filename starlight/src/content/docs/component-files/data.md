---
title: "Data"
---

**File:** `data.json`

The `data.json` file lets you opt in to exposing JSON data to your component's JavaScript via a `<script type="application/json">` tag in the DOM. By default, no JSON is exposed — you must create a `data.json` file in your component folder to enable this.

## How it works

When _miyagi_ finds a `data.json` file in a component folder, it injects a `<script type="application/json" id="miyagi-mock-data">` tag into the component's rendered HTML. Your component's JavaScript can then read and parse this data.

The data is only exposed when the component is the **primary subject** of the view — that is, when you are viewing the component directly (overview, specific variation, or standalone page). If the component is included as a partial within a larger template or component, its `data.json` is not used.

## Using custom JSON

The simplest use case: the content of `data.json` is the JSON you want to expose.

```json
{
  "apiEndpoint": "/api/search",
  "maxResults": 10,
  "locale": "en-US"
}
```

This JSON will be available in the DOM exactly as written.

## Using mock data as the source

If your component's JavaScript needs the same data that drives the template, set `useMocks` to `true`:

```json
{
  "useMocks": true
}
```

When `useMocks` is `true`, _miyagi_ runs the component's mock data through its full resolution pipeline (including `$ref` resolution, `$tpl` rendering, and global data merging) and exposes the resolved result. When viewing a specific variation, the variation's resolved data is used.

The `useMocks` property is always stripped from the exposed JSON.

## Reading the data in JavaScript

```js
const scriptTag = document.getElementById("miyagi-mock-data");

if (scriptTag) {
  const data = JSON.parse(scriptTag.textContent);
  // Use data...
}
```

## Viewing data.json in the UI

When a component has a `data.json` file, its content is shown in the **Files** section of the component overview page, alongside the schema, mocks, and template tabs.

Please refer to "[Exposing JSON data to components](/how-to/exposing-json-data-to-components/)" for a practical guide on when and how to use this feature.
