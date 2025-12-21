/**
 * Setup file for calculator.story
 * Ensures each scenario starts with a clean state
 */

import { beforeScenario, afterScenario } from "vitest-story";

// Create a fresh calculator for each scenario
const createCalculator = () => ({
  value: 0,
  add(n: number) {
    this.value += n;
  },
  subtract(n: number) {
    this.value -= n;
  },
  reset() {
    this.value = 0;
  },
});

beforeScenario((ctx) => {
  // Create a fresh calculator instance for each scenario
  ctx.calculator = createCalculator();
});

afterScenario((ctx) => {
  // Clean up after scenario
  if (ctx.calculator) {
    ctx.calculator = null;
  }
});
