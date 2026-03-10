#!/usr/bin/env node
import runCli from "../index.js";

const result = await runCli();

if (result?.shouldExit) {
  process.exit(result.code ?? 0);
}

process.exitCode = result?.code ?? 0;
