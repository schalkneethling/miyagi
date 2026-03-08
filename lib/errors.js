/**
 * CLI/process exit codes used by miyagi.
 *
 * Keep this list small and coarse-grained. The goal is predictable automation,
 * not a unique code for every possible failure.
 */
export const EXIT_CODES = Object.freeze({
	SUCCESS: 0,
	GENERAL_ERROR: 1,
	CLI_USAGE_ERROR: 2,
	CONFIG_ERROR: 3,
	VALIDATION_ERROR: 4,
});

export class MiyagiError extends Error {
	/**
	 * @param {string} message
	 * @param {object} [options]
	 * @param {number} [options.code] Exit code from `EXIT_CODES`.
	 * @param {boolean} [options.logged] True if this error was already sent to the logger and should not be logged again at the CLI boundary.
	 */
	constructor(
		message,
		{ code = EXIT_CODES.GENERAL_ERROR, logged = false } = {},
	) {
		super(message);
		this.name = "MiyagiError";
		this.code = code;
		this.logged = logged;
	}
}
