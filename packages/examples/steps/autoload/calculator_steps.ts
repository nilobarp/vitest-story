/**
 * Calculator step definitions for simple arithmetic testing
 */

import { Given, When, Then } from "vitest-story";
import { expect } from "vitest";

// Simple calculator for testing
const calculator = {
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
};

Given("the calculator is reset", () => {
  calculator.reset();
});

When("I add {int}", (ctx, params) => {
  calculator.add(parseInt(params.int));
});

When("I subtract {int}", (ctx, params) => {
  calculator.subtract(parseInt(params.int));
});

Then("the result should be {int}", (ctx, params) => {
  expect(calculator.value).toBe(parseInt(params.int));
});
