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
  // Guard against budgetBytes === 0: with bytes also 0, the warn check
  // (bytes >= budgetBytes * warnRatio → 0 >= 0) would otherwise flip to
  // "warn", which isn't a useful answer when nothing is shipped against
  // a zero budget.
  if (bytes > 0 && bytes >= budgetBytes * warnRatio) {
    return "warn";
  }
  return "ok";
}
