# Contributing

## Documentation

When changing defaults or API response shapes, update docs in the same PR.

### Default configuration

`docs/configuration/default-configuration.md` is generated from `lib/default-config.js`. After editing defaults:

```bash
pnpm docs:sync-default-config
```

CI runs `pnpm docs:check-default-config` to catch drift.
