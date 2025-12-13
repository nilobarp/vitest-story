# vitest-story

A lightweight, fast, and modern BDD framework built directly on top of Vitest.

## The Story Behind vitest-story

We built `vitest-story` out of frustration. While we appreciated the Behavior Driven Development (BDD) methodology, the existing tooling in the JavaScript ecosystem felt heavy and fragmented. Cucumber JS, while the standard, often introduced significant overhead, slow startup times, and a disconnect between the feature files and the code.

We wanted a solution that:

1.  **Ran at the speed of modern development.** We didn't want to wait for a slow test runner.
2.  **Reduced context switching.** We wanted our stories to live close to our code, not isolated in separate text files that drift out of sync.
3.  **Leveraged the tools we already use.** We didn't want a separate CLI or a complex configuration just to run BDD tests.

We chose **Vitest** as our bedrock because it is blazing fast, has excellent TypeScript support out of the box, and integrates seamlessly with the modern web ecosystem (Vite, Vue, React, etc.). `vitest-story` is a thin, powerful layer that brings Gherkin-style syntax directly into your Vitest suites.

## Features

- **Inline Stories:** Write your Gherkin scenarios directly in your TypeScript/JavaScript test files using the `story` template literal. No more context switching between `.feature` files and step definitions.
- **Native Vitest Integration:** Runs as standard Vitest tests. You get all the benefits of Vitest: watch mode, smart filtering, parallel execution, and instant feedback.
- **Type-Safe Steps:** Define steps (`Given`, `When`, `Then`) with full TypeScript support.
- **Flexible Organization:** Colocate steps with tests or organize them in a dedicated directory—it's up to you.
- **Lifecycle Hooks:** Full support for `beforeFeature`, `afterFeature`, `beforeScenario`, and `afterScenario` hooks.
- **Zero Boilerplate:** Minimal configuration required. Install, import, and write your first story.

## Comparison with Cucumber JS

| Feature              | Cucumber JS                    | vitest-story                        |
| :------------------- | :----------------------------- | :---------------------------------- |
| **Execution Engine** | Custom CLI / Runner            | Vitest                              |
| **Speed**            | Slower startup, overhead       | Blazing fast (powered by Vite)      |
| **Syntax**           | `.feature` files (Gherkin)     | Template literals in `.ts`/`.js`    |
| **Step Definitions** | Separate files, regex matching | Imported functions, string matching |
| **TypeScript**       | Requires setup/compilation     | Native support                      |
| **Ecosystem**        | Large, but fragmented          | Integrated with Vite/Vitest         |

## Benefits

- **Speed:** Tests run instantly.
- **Simplicity:** No complex glue code. Just imports.
- **Developer Experience:** IntelliSense, type checking, and debugging work out of the box in your editor.
- **Maintainability:** Keep your requirements (stories) and verification (tests) in sync effortlessly.

## Getting Started

### Installation

```bash
npm install -D vitest vitest-story
# or
pnpm add -D vitest vitest-story
# or
yarn add -D vitest vitest-story
```

### Writing Your First Story

1.  **Define your steps.** You can do this in a separate file or right next to your test.

```typescript
// steps.ts
import { Given, When, Then } from "vitest-story";
import { expect } from "vitest";

let accountBalance = 0;

Given("my account balance is {int}", (amount: number) => {
  accountBalance = amount;
});

When("I withdraw {int}", (amount: number) => {
  accountBalance -= amount;
});

Then("my account balance should be {int}", (amount: number) => {
  expect(accountBalance).toBe(amount);
});
```

2.  **Write your story.** Create a test file (e.g., `bank.test.ts`).

```typescript
// bank.test.ts
import { story } from "vitest-story";
import "./steps"; // Import your steps

story`
  Feature: Bank Account Operations

  Scenario: Successful Withdrawal
    Given my account balance is 100
    When I withdraw 20
    Then my account balance should be 80

  Scenario: Multiple Withdrawals
    Given my account balance is 500
    When I withdraw 50
    And I withdraw 50
    Then my account balance should be 400
`;
```

3.  **Run it.**

```bash
npx vitest
```

## Example: Shopping Cart

Here is a more complete example showing how `vitest-story` handles data and multiple steps.

```typescript
import { story } from "vitest-story";
import { expect } from "vitest";
import { Given, When, Then } from "vitest-story";

// Simple cart implementation for the example
const cart = {
  items: [] as string[],
  add(item: string) {
    this.items.push(item);
  },
  contains(item: string) {
    return this.items.includes(item);
  },
  size() {
    return this.items.length;
  },
};

Given("the shopping cart is empty", () => {
  cart.items = [];
});

When("I add {string} to the cart", (item: string) => {
  cart.add(item);
});

Then("the cart should contain {int} item(s)", (count: number) => {
  expect(cart.size()).toBe(count);
});

Then("the cart should contain {string}", (item: string) => {
  expect(cart.contains(item)).toBe(true);
});

story`
  Feature: Shopping Cart

  Scenario: Adding items
    Given the shopping cart is empty
    When I add "Apple" to the cart
    And I add "Banana" to the cart
    Then the cart should contain 2 items
    And the cart should contain "Apple"
`;
```
