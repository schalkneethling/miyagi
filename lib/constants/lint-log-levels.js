export const LINT_LOG_LEVELS = Object.freeze({
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
});

export const LINT_LOG_LEVEL_ORDER = Object.freeze({
  [LINT_LOG_LEVELS.ERROR]: 0,
  [LINT_LOG_LEVELS.WARN]: 1,
  [LINT_LOG_LEVELS.INFO]: 2,
});
