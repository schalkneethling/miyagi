---
title: "CLI commands"
---

Use `miyagi <command>` if installed globally.

If installed locally, use one of:

```bash
pnpm exec miyagi <command>
yarn miyagi <command>
npx miyagi <command>
```

## Commands

| Command                | Purpose                                              | Docs                                                              |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| `miyagi start`         | Start the local miyagi server                        | [Starting miyagi](/cli-commands/starting-miyagi/)                 |
| `miyagi build`         | Create a static build                                | [Creating a build](/cli-commands/creating-a-build/)               |
| `miyagi new`           | Scaffold a new component                             | [Creating a component](/cli-commands/creating-a-component/)       |
| `miyagi mocks`         | Generate mock data from a schema                     | [Creating mock data](/cli-commands/creating-mock-data/)           |
| `miyagi lint`          | Validate schema files and mock data                  | [Linting mock data](/cli-commands/linting-mock-data/)             |
| `miyagi drupal-assets` | Resolve Drupal component assets into `$assets`       | [Resolving Drupal assets](/cli-commands/resolving-drupal-assets/) |
| `miyagi doctor`        | Check config and environment for common setup issues | [Running doctor](/cli-commands/running-doctor/)                   |
| `miyagi budget`        | Check asset sizes against a performance budget       | [Performance budget](/cli-commands/performance-budget/)           |

## Global options

| Option            | Purpose                            |
| ----------------- | ---------------------------------- |
| `-h`, `--help`    | Show command help                  |
| `--version`       | Print the installed miyagi version |
| `-v`, `--verbose` | Enable extra log output            |

## Start-only options

| Option                                        | Purpose                           |
| --------------------------------------------- | --------------------------------- |
| `--watch-report`                              | Print startup watch report output |
| `--watch-report-format pretty\|summary\|json` | Change watch report format        |
| `--watch-report-no-color`                     | Disable watch report colors       |

For watch report config details, see [`watch.report`](/configuration/options/#watch).
