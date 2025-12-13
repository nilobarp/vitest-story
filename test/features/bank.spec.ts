import { story, Given, When, Then } from "vitest-story";
import { expect } from "vitest";

// Bank account steps
Given("my account balance is {int}", (ctx, params) => {
  ctx.balance = params.int;
});

When("I withdraw {int}", (ctx, params) => {
  ctx.balance -= params.int;
});

When("I deposit {int}", (ctx, params) => {
  ctx.balance += params.int;
});

Then("my account balance should be {int}", (ctx, params) => {
  expect(ctx.balance).toBe(params.int);
});

story`
  Scenario: Successful Withdrawal
    Given my account balance is 100
    When I withdraw 20
    Then my account balance should be 80
`();

story`
  Scenario: Multiple Withdrawals
    Given my account balance is 500
    When I withdraw 50
    Then I withdraw 150
    And I deposit 100
    Then my account balance should be 400
`();
