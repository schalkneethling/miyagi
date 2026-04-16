import AJV from "ajv";

export default {
  defaultUserConfig: {
    assets: {
      root: "",
      css: [],
      shared: {
        css: [],
        js: [],
      },
      isolateComponents: false,
      customProperties: {
        files: [],
        prefixes: {
          typo: "typo",
          color: "color",
          spacing: "spacing",
        },
      },
      folder: [],
      js: [],
      manifest: null,
    },
    build: {
      basePath: "/",
      folder: "build",
    },
    docs: {
      folder: "docs",
    },
    components: {
      folder: "src",
      ignores: [
        "node_modules",
        ".git",
        "package.json",
        "package-lock.json",
        ".miyagi.js",
        ".miyagi.mjs",
      ],
      lang: "en",
      textDirection: "ltr",
    },
    engine: {
      render: null,
      options: {},
    },
    lint: {
      logLevel: "error",
    },
    htmlValidation: {
      output: "html-validation-report.md",
      htmlValidateConfig: {
        extends: ["html-validate:recommended"],
        rules: {
          "doctype-style": "off",
          "input-missing-label": "error",
          "missing-doctype": "off",
          "no-missing-references": "off",
        },
      },
    },
    extensions: [],
    files: {
      css: {
        abbr: "css",
        name: "index",
        extension: "css",
      },
      js: {
        abbr: "js",
        name: "index",
        extension: "js",
      },
      mocks: {
        abbr: "mocks",
        name: "mocks",
        extension: ["json", "js"],
      },
      schema: {
        abbr: "schema",
        name: "schema",
        extension: "json",
      },
      templates: {
        abbr: "tpl",
        name: "index",
      },
    },
    namespaces: {},
    // Performance budget feature — tracks asset byte size against configured
    // limits and surfaces the state via `miyagi budget`, the build-time report,
    // and the dev-server UI. Defaults mirror the "Slow 4G / Moto G4" tier from
    // web.dev's "Your First Performance Budget" (see docs).
    performance: {
      enabled: true,
      compression: "gzip",
      report: {
        failOnExceed: false,
        output: "performance-report.md",
      },
      budgets: {
        global: {
          css: "35 kB",
          js: "200 kB",
          total: null,
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
        perComponent: {
          css: null,
          js: null,
          total: null,
        },
      },
    },
    projectName: "miyagi",
    ui: {
      mode: "light",
      lang: "en",
      reload: true,
      reloadAfterChanges: {
        componentAssets: true,
      },
      textDirection: "ltr",
      theme: {
        css: null,
        favicon: null,
        js: null,
        logo: {
          light: null,
          dark: null,
        },
      },
      watchConfigFile: true,
    },
    watch: {
      enabled: true,
      backend: "chokidar",
      sources: [],
      ignore: {
        defaults: true,
        patterns: [],
      },
      behavior: {
        startupGraceMs: 500,
        debounceMs: 60,
        coalesceWindowMs: 120,
        awaitWriteFinish: {
          enabled: true,
          stabilityThresholdMs: 200,
          pollIntervalMs: 50,
        },
      },
      reload: {
        enabled: true,
        rules: {
          template: "iframe",
          data: "parent",
          docs: "parent",
          schema: "iframe",
          componentAsset: "iframe",
          globalCss: "iframe",
          globalJs: "iframe",
          unknown: "parent",
        },
      },
      socket: {
        reconnect: {
          enabled: true,
          initialDelayMs: 250,
          maxDelayMs: 5000,
          jitter: true,
        },
        heartbeat: {
          enabled: true,
          intervalMs: 30000,
        },
      },
      report: {
        enabled: true,
        onStart: true,
        format: "summary",
        destination: "stdout",
        useColors: true,
      },
      configFile: {
        enabled: true,
      },
      debug: {
        logEvents: false,
        logDecisions: false,
        logResolvedSources: false,
      },
    },
    schema: {
      ajv: AJV,
      verbose: false,
    },
    schemaValidationMode: "collect-all",
  },
  projectName: "miyagi",
  defaultPort: 5000,
  folders: {
    assets: {
      development: "frontend/assets",
      production: "dist",
    },
  },
  defaultVariationName: "default",
};
