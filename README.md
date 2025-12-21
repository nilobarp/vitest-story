# Vitest Story

A lightweight, fast, and modern BDD (Behavior-Driven Development) framework built directly on top of Vitest. Write Gherkin-style scenarios inline with your tests and run them at blazing speed.

## 🎯 Why Vitest Story?

Traditional BDD tools in JavaScript come with overhead - separate feature files, complex configuration, slow test runners, and constant context switching. **Vitest Story** changes that:

- ✨ **Write scenarios inline** with your TypeScript/JavaScript tests
- ⚡ **Blazing fast** execution powered by Vite and Vitest
- 🔒 **Type-safe** step definitions with full TypeScript support
- 🎨 **VS Code integration** with Test Explorer and step navigation
- 🔄 **Zero boilerplate** - minimal configuration required

## 📦 What's Included

This monorepo contains two packages:

### 🔧 [vitest-story](./packages/plugin) - The Core Library

The testing library that brings BDD to Vitest. Write Gherkin scenarios using template literals and define type-safe steps.

```typescript
import { story, Given, When, Then } from "vitest-story";
import { expect } from "vitest";

Given("my account balance is {int}", (ctx, params) => {
  ctx.balance = params.int;
});

When("I withdraw {int}", (ctx, params) => {
  ctx.balance -= params.int;
});

Then("my account balance should be {int}", (ctx, params) => {
  expect(ctx.balance).toBe(params.int);
});

story`
  Feature: Bank Account

  Scenario: Successful Withdrawal
    Given my account balance is 100
    When I withdraw 20
    Then my account balance should be 80
`();
```

[📖 Read the full library documentation →](./packages/plugin/README.md)

### 🎨 [vitest-story-extension](./packages/vsix) - VS Code Extension

A VS Code extension that supercharges your BDD workflow with:

- **Test Explorer integration** - View and run scenarios directly from VS Code
- **Go to Definition** - Cmd/Ctrl+Click on steps to navigate to their implementation
- **Real-time discovery** - Automatically detects new scenarios as you write them
- **Debug support** - Set breakpoints and debug your scenarios

[📖 Read the extension documentation →](./packages/vsix/README.md)

## 🚀 Quick Start

### 1. Install the Library

```bash
npm install -D vitest vitest-story
# or
pnpm add -D vitest vitest-story
```

### 2. Install the VS Code Extension (Optional but Recommended)

Search for "Vitest Story" in the VS Code Extensions marketplace, or install from the [releases page](https://github.com/nilobarp/vitest-story/releases).

### 3. Write Your First Story

Create a test file (`example.test.ts`):

```typescript
import { story, Given, When, Then } from "vitest-story";
import { expect } from "vitest";

const cart = {
  items: [] as string[],
  add(item: string) {
    this.items.push(item);
  },
  size() {
    return this.items.length;
  },
};

Given("the shopping cart is empty", () => {
  cart.items = [];
});

When("I add {string} to the cart", (ctx, params) => {
  cart.add(params.string);
});

Then("the cart should contain {int} item(s)", (ctx, params) => {
  expect(cart.size()).toBe(params.int);
});

story`
  Feature: Shopping Cart

  Scenario: Adding items
    Given the shopping cart is empty
    When I add "Apple" to the cart
    And I add "Banana" to the cart
    Then the cart should contain 2 items
`();
```

### 4. Run Your Tests

```bash
npx vitest
```

## 🌟 Key Features

### Inline Scenarios

No more switching between `.feature` files and step definitions. Your scenarios live right next to your code.

### Parameter Support

Extract values from steps automatically:

- `{int}` - Integers
- `{float}` - Floating point numbers
- `{string}` - Quoted strings
- `{word}` - Single words
- `{customName}` - Any custom named parameter

### Lifecycle Hooks

Full support for setup and teardown:

```typescript
import {
  beforeScenario,
  afterScenario,
  beforeFeature,
  afterFeature,
} from "vitest-story";

beforeFeature((ctx) => {
  // Runs once before all scenarios
});

beforeScenario((ctx) => {
  // Runs before each scenario
});
```

### Tags

Organize and filter your tests using tags:

```typescript
story`
  @fast
  @calculator
  Feature: Calculator Operations

  @smoke
  Scenario: Addition
    When I add 5
    Then the result should be 5

  @skip
  Scenario: Work in progress
    Given incomplete feature
`();
```

Run tests with specific tags:

```bash
# Run only @smoke tests
VITEST_STORY_TAGS=smoke npx vitest

# Run @smoke or @fast tests
VITEST_STORY_TAGS=smoke,fast npx vitest
```

You can also configure tag filtering using Vitest projects in your `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import { vitestStoryPlugin } from "vitest-story";

export default defineConfig({
  plugins: [
    vitestStoryPlugin({
      stepsPaths: ["./steps"],
      storyPaths: ["./stories"],
    }),
  ],
  test: {
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}", "**/*.story"],
    // Use projects to run different tag combinations
    projects: [
      {
        extends: true,
        test: {
          name: "smoke-tests",
          env: {
            VITEST_STORY_TAGS: "smoke",
          },
        },
      },
      {
        extends: true,
        test: {
          name: "fast-tests",
          env: {
            VITEST_STORY_TAGS: "smoke,fast",
          },
        },
      },
    ],
  },
});
```

This allows you to run specific test suites:

```bash
# Run smoke tests only
npx vitest --project=smoke-tests

# Run fast tests
npx vitest --project=fast-tests

# Run all projects
npx vitest
```

### YAML Data Tables

Include structured data in your scenarios:

```typescript
story`
  Scenario: Bulk operations
    Given I have these users:
      ---
      - name: Alice
        age: 30
      - name: Bob
        age: 25
      ---
`();
```

## 📊 Comparison with Cucumber JS

| Feature           | Cucumber JS               | Vitest Story                   |
| ----------------- | ------------------------- | ------------------------------ |
| **Speed**         | Slow startup              | Instant (Vite-powered)         |
| **File Format**   | Separate `.feature` files | Inline template literals       |
| **TypeScript**    | Requires extra setup      | Native support                 |
| **Test Runner**   | Custom CLI                | Vitest (with watch mode)       |
| **Step Matching** | Regex in separate files   | Imported functions             |
| **IDE Support**   | Limited                   | Full IntelliSense + Navigation |

## 🏗️ Project Structure

```
vitest-story/
├── packages/
│   ├── plugin/          # Core vitest-story library
│   │   ├── src/
│   │   ├── README.md
│   │   └── package.json
│   ├── vsix/            # VS Code extension
│   │   ├── src/
│   │   ├── README.md
│   │   └── package.json
│   └── examples/        # Example tests
└── README.md            # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE.md](./packages/plugin/LICENSE.md) for details.

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/vitest-story) (Coming Soon)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=nilobarp.vitest-story-extension) (Coming Soon)
- [GitHub Repository](https://github.com/nilobarp/vitest-story)
- [Issue Tracker](https://github.com/nilobarp/vitest-story/issues)

## 💡 Examples

Check out the [examples directory](./packages/examples) for more complete examples including:

- Basic step definitions
- Shopping cart with database
- Auto-loaded step definitions
- Complex scenarios with hooks

---

**Happy Testing!** 🎉
