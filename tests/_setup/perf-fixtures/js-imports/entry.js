// Exercises every JS import pattern the dependency-tree walker should see.
import greet from "./default-export.js";
import { ALPHA, combine } from "./named-exports.js";
import defaultAndNamed, { BETA } from "./named-exports.js";
import * as constants from "./star-target.js";
import "./side-effect.js";
import { clamp } from "./helpers/utils.js";

export * from "./reexport-all.js";
export { PUBLISHED_VALUE } from "./reexport-named.js";

export function describe() {
  return {
    greeting: greet("world"),
    alpha: ALPHA,
    beta: BETA,
    combined: combine(ALPHA, BETA),
    constants,
    defaultAndNamed,
    clamp,
  };
}
