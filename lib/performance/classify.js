// @ts-check

/**
 * Classify a measured byte size against an optional budget. Shared by the
 * component and page measurement modules so the priority order (missing >
 * unbudgeted > exceed > warn > ok) stays consistent everywhere.
 * @param {{
 *   bytes: number,
 *   budgetBytes: number|null,
 *   warnRatio: number,
 *   missing?: boolean,
 * }} input
 * @returns {"ok"|"warn"|"exceed"|"unbudgeted"|"missing"}
 */
export function classify({ bytes, budgetBytes, warnRatio, missing = false }) {
  if (missing) {
    return "missing";
  }
  if (budgetBytes == null) {
    return "unbudgeted";
  }
  if (bytes > budgetBytes) {
    return "exceed";
  }
  if (bytes >= budgetBytes * warnRatio) {
    return "warn";
  }
  return "ok";
}
