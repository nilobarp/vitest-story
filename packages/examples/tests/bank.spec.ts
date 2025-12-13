import { story, Given, When, Then } from "vitest-story";
import { expect } from "vitest";

// Bank account steps
Given("my account balance is {amount}", (ctx, params) => {
  ctx.balance = parseInt(params.amount);
});

When("I withdraw {amount}", (ctx, params) => {
  ctx.balance -= parseInt(params.amount);
});

When("I deposit {amount}", (ctx, params) => {
  ctx.balance += parseInt(params.amount);
});

Then("my account balance should be {expected}", (ctx, params) => {
  expect(ctx.balance).toBe(parseInt(params.expected));
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
