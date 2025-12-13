import { expect, beforeEach } from "vitest";
import { story, clearSteps } from "../src";

beforeEach(() => {
  clearSteps();
});

// Test 1: Simple scenario execution
story`
  Scenario: Simple test with state management
    Given I have a starting state
    When I perform an action
    Then I see a result
`(({ step }) => {
  step("I have a starting state", (ctx) => {
    ctx.state = "initial";
  });

  step("I perform an action", (ctx) => {
    ctx.state = "acted";
  });

  step("I see a result", (ctx) => {
    expect(ctx.state).toBe("acted");
  });
});

// Test 2: Parameters in steps
story`
  Scenario: Parameter extraction test
    Given I set name to "John"
    Then name should be "John"
`(({ step }) => {
  step('I set name to "{value}"', (ctx, params) => {
    ctx.name = params.value;
  });

  step('name should be "{expected}"', (ctx, params) => {
    expect(ctx.name).toBe(params.expected);
  });
});

// Test 3: YAML blocks with triple quotes
story`
  Scenario: YAML parsing with triple quotes
    Given I have configuration:
      """yaml
      timeout: 5000
      retries: 3
      """
    Then timeout should be 5000
`(({ step }) => {
  step("I have configuration:\n{yaml}", (ctx, params) => {
    ctx.config = params.yaml;
  });

  step("timeout should be {value}", (ctx, params) => {
    expect(ctx.config.timeout).toBe(parseInt(params.value));
  });
});

// Test 4: Indented YAML blocks
story`
  Scenario: Indented YAML parsing
    Given I configure settings:
      enabled: true
      level: high
    Then settings should be configured
`(({ step }) => {
  step("I configure settings:\n{yaml}", (ctx, params) => {
    ctx.settings = params.yaml;
  });

  step("settings should be configured", (ctx) => {
    expect(ctx.settings.enabled).toBe(true);
    expect(ctx.settings.level).toBe("high");
  });
});

// Test 5: Context maintenance
story`
  Scenario: Context persists across steps
    Given I set counter to 0
    When I increment counter
    And I increment counter
    Then counter should be 2
`(({ step }) => {
  step("I set counter to {value}", (ctx, params) => {
    ctx.counter = parseInt(params.value);
  });

  step("I increment counter", (ctx) => {
    ctx.counter = (ctx.counter || 0) + 1;
  });

  step("counter should be {expected}", (ctx, params) => {
    expect(ctx.counter).toBe(parseInt(params.expected));
  });
});

// Test 6: Async step functions
story`
  Scenario: Async operations work correctly
    Given I start async operation
    When I wait for completion
    Then operation is complete
`(({ step }) => {
  step("I start async operation", async (ctx) => {
    ctx.status = "pending";
  });

  step("I wait for completion", async (ctx) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    ctx.status = "complete";
  });

  step("operation is complete", (ctx) => {
    expect(ctx.status).toBe("complete");
  });
});

// Test 7: And keywords
story`
  Scenario: And keyword combines states
    Given I have state A
    And I have state B
    When I combine them
    Then I have state AB
`(({ step }) => {
  step("I have state {state}", (ctx, params) => {
    ctx.states = (ctx.states || []).concat(params.state);
  });

  step("I combine them", (ctx) => {
    ctx.combined = ctx.states.join("");
  });

  step("I have state {expected}", (ctx, params) => {
    expect(ctx.combined).toBe(params.expected);
  });
});
