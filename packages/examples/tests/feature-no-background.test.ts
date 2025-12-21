/**
 * Test Feature with multiple scenarios but no Background
 */

import { story, Given, When, Then } from "vitest-story";
import { expect } from "vitest";

// Simple calculator for testing
let calculator = {
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

story`
  Feature: Calculator Operations
  
  Scenario: Addition
    Given the calculator is reset
    When I add 5
    And I add 3
    Then the result should be 8
  
  Scenario: Subtraction
    Given the calculator is reset
    When I add 10
    And I subtract 3
    Then the result should be 7
  
  Scenario: Mixed operations
    Given the calculator is reset
    When I add 20
    And I subtract 5
    And I add 10
    Then the result should be 25
`();
