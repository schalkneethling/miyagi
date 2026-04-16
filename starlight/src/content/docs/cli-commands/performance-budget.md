---
title: "Performance budget"
---

_miyagi_ can track the byte size of the assets it ships — global CSS, global JS, static asset folders, and (post-build) rendered HTML pages — against a configured performance budget. Because _miyagi_ already owns the authoritative list of assets for your component library, it's a natural place to run this check.

Budgets are enforced in three places:

1. **On-demand**: `miyagi budget` prints a table of current vs. budgeted sizes.
2. **Build-time**: `miyagi build` writes a `performance-report.md` alongside `output.json` and logs a one-line summary. Non-failing by default.
3. **Dev server**: a **Performance** entry in the menu (dev-mode only) shows the live table, updated on each render.

## On-demand check

```bash
miyagi budget
```

Prints an evaluation table to stdout with columns `Category | Item | Actual | Budget | Status`. Exits `0` unless `--fail` is set.

### Options

| Option            | Purpose                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `--compression`   | `raw`, `gzip`, or `brotli` — overrides the configured compression metric    |
| `--fail`          | Exit non-zero (`4`) if any budget is exceeded                               |
| `--json`          | Emit the raw evaluation as JSON on stdout (for CI / automation)             |
| `--output`, `-o`  | Also write a markdown report to this path                                   |
| `--build-folder`  | Include post-build HTML pages from this folder (reads `output.json`)        |
| `--list-all-pages` | List every HTML page, not just those that exceed or warn                   |

## Configuration

Configure in `.miyagi.js` / `.miyagi.mjs`:

```js
export default {
  performance: {
    enabled: true,
    compression: "gzip", // "raw" | "gzip" | "brotli"
    report: {
      failOnExceed: false,
      output: "performance-report.md", // bare filename lands inside build/
    },
    budgets: {
      global: {
        css: "35 kB",
        js: "200 kB",
        total: null, // optional umbrella across CSS + JS
      },
      html: {
        perPage: "30 kB",
        total: null,
      },
      folders: {
        fonts: { total: "30 kB" },
        images: { total: "50 kB" },
        total: null,
      },
    },
  },
};
```

Sizes accept human strings (`"50 kB"`, `"1.5 MB"`) or plain numbers (bytes). `null` disables budgeting for that slot — the file is still measured and shown, just not evaluated.

### Status semantics

- **OK** — under 80% of budget
- **WARN** — at or above 80% of budget
- **EXCEED** — over budget
- **—** (unbudgeted) — no budget set for this category

## Default budgets & sources

The defaults (Global CSS: 35 kB, Global JS: 200 kB, HTML per page: 30 kB, Fonts folder: 30 kB, Images folder: 50 kB) track the **Slow 4G / Moto G4** tier from web.dev's "Your First Performance Budget" guide. All values are gzip-compressed transfer bytes — matches the `compression: "gzip"` default, which is in turn the convention established by ["Performance Budgets 101"](https://web.dev/articles/performance-budgets-101).

These are a **starting point**, not a verdict. Real budgets should be derived from your own performance goals and real-user data.

Sources:

- **[Your First Performance Budget](https://web.dev/articles/your-first-performance-budget)** (Addy Osmani & Kayce Basques, web.dev) — the tiered per-category kB table our defaults track. Projects targeting emerging markets may prefer the Slow 3G tier (100 kB JS, 10 kB CSS, 30 kB HTML). Projects targeting desktop-primarily may lift to the WiFi tier (300 kB JS, 50 kB CSS, 100 kB fonts).
- **[Performance Budgets 101](https://web.dev/articles/performance-budgets-101)** (web.dev) — establishes the ~170 kB critical-path budget for mobile 3G and the framing that budgets should be expressed in gzipped/minified transfer size.
- **[SpeedCurve — Web Performance Budgets](https://www.speedcurve.com/web-performance-guide/performance-budgets/)** — framing and terminology. Numerical baselines live in the SpeedCurve product rather than the public guide.
- **[HTTP Archive — Page Weight report](https://httparchive.org/reports/page-weight)** — useful as a "current reality" baseline (what median sites actually ship), not as a prescriptive target.

## Build-time reporting

`miyagi build` runs the budget check automatically after writing `output.json`:

```bash
miyagi build
# → Performance budget (gzip): 3 ok, 1 warn, 0 exceed, 2 unbudgeted.
# → Wrote build/performance-report.md.
```

The report is always written; the build only fails when `performance.report.failOnExceed: true` and something is over budget.

## Dev server

With `miyagi start`, a **Performance** entry appears in the sidebar (dev-mode only — it is never generated into a static build). The panel renders the same table as the CLI, refreshed on each request. A JSON endpoint is also available at `/api/performance` for tooling integrations.

## CI usage

```bash
miyagi budget --fail --json > budget.json
```

Combined with `--output` you can commit / post the markdown report as a PR artefact.

## Exit codes

- `0` — within budget (or exceed observed but `--fail` not set)
- `2` — CLI usage error
- `4` — budget exceeded with `--fail` or `performance.report.failOnExceed: true`

## What's measured today

- Global CSS (`config.assets.css` + `config.assets.shared.css`)
- Global JS (`config.assets.js` + `config.assets.shared.js`)
- Each configured asset folder (`config.assets.folder[]`), aggregated
- Each rendered HTML page (build-time only, iterated from `output.json`)

Per-component budgets are reserved in the config shape (`budgets.perComponent`) but not yet evaluated — that is planned for a follow-up.
