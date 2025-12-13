/**
 * Common step definitions that can be reused across scenarios
 * Import this file in your test setup to make these steps available globally
 */

import { Given, When, Then } from "@vitest-story/plugin";
import { expect } from "vitest";

// Counter steps
Given("counter starts at {value}", (ctx, params) => {
  ctx.counter = parseInt(params.value);
});

When("I increment counter", (ctx) => {
  ctx.counter = (ctx.counter || 0) + 1;
});

When("I increment counter by {amount}", (ctx, params) => {
  ctx.counter = (ctx.counter || 0) + parseInt(params.amount);
});

Then("counter is {expected}", (ctx, params) => {
  expect(ctx.counter).toBe(parseInt(params.expected));
});

// State management steps
Given("I have a starting state", (ctx) => {
  ctx.state = "initial";
});

When("I perform an action", (ctx) => {
  ctx.state = "acted";
});

Then("I see a result", (ctx) => {
  expect(ctx.state).toBe("acteded");
});

// Generic value steps
Given('I set {key} to "{value}"', (ctx, params) => {
  ctx[params.key] = params.value;
});

Then('{key} should be "{expected}"', (ctx, params) => {
  expect(ctx[params.key]).toBe(params.expected);
});
