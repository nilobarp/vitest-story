/**
 * Calculator step definitions for simple arithmetic testing
 */

import { step, Given, When, Then, But, And } from "vitest-story";
import { expect } from "vitest";

// Helper to get or create calculator from context
const getCalculator = (ctx: any) => {
  if (!ctx.calculator) {
    ctx.calculator = {
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
  }
  return ctx.calculator;
};

Given("the calculator is reset", (ctx) => {
  const calculator = getCalculator(ctx);
  calculator.reset();
});

When("I add {int}", (ctx, params) => {
  const calculator = getCalculator(ctx);
  calculator.add(parseInt(params.int));
});

When("I subtract {int}", (ctx, params) => {
  const calculator = getCalculator(ctx);
  calculator.subtract(parseInt(params.int));
});

Then("the result should be {int}", (ctx, params) => {
  const calculator = getCalculator(ctx);
  expect(calculator.value).toBe(parseInt(params.int));
});

But("the result should not be {int}", (ctx, params) => {
  const calculator = getCalculator(ctx);
  expect(calculator.value).not.toBe(parseInt(params.int));
});

step('the result wont be {number1}', async (ctx, { number1 }) => {
  const calculator = getCalculator(ctx);
  expect(calculator.value).not.toBe(parseInt(number1));
});