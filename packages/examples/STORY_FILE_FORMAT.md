# .story File Format Guide

The vitest-story framework now supports standalone `.story` files with plain Gherkin syntax - no template literals or `story()` calls needed!

## Quick Start

### 1. Create a .story file

**stories/shopping-cart.story**
```gherkin
Feature: Shopping Cart 

Background: 
    Given a SQLite database is running
    And a user is registered with email "john.doe@example.com" and password "password123"
    When the user logs in with email "john.doe@example.com" and password "password123"
    Then the user should be authenticated
    
Scenario: User adds items to shopping cart
    When the user adds a product with id "prod_001" and quantity 2 to their cart
    And the user adds a product with id "prod_002" and quantity 1 to their cart
    Then the user's cart should contain 2 items

Scenario: Feature flag scenario
    Given I start extracting prices
    And the "USE_EXTRACTION_DATA_MODEL" feature flag is enabled
    And AI extracts prices for "Tim's Cabinetry":
      """yaml
      materials:
        - name: Oak Wood
          price: 150.00
      """
    Then "Tim's Cabinetry" has prices extracted
```

### 2. (Optional) Create a setup file

If your story needs test setup/teardown, create a `.setup.ts` file with the same base name:

**stories/shopping-cart.setup.ts**
```typescript
import { beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";

let db: Database.Database;

beforeAll(async () => {
  db = new Database("/tmp/test.db");
  db.exec(`CREATE TABLE users (...)`);
}, 60000);

afterAll(async () => {
  db.close();
});
```

The setup file is automatically imported if it exists.

### 3. Configure Vitest

**vitest.config.ts**
```typescript
import { defineConfig } from "vitest/config";
import { vitestStoryPlugin } from "vitest-story";

export default defineConfig({
  plugins: [
    vitestStoryPlugin({
      stepsPaths: ["./steps"],      // Where step definitions are
      storyPaths: ["./stories"],    // Where .story files are
    }),
  ],
  test: {
    // Include .story files in test patterns
    include: ["**/*.{test,spec}.{ts,tsx}", "**/*.story"],
  },
});
```

### 4. Define your steps

Step definitions work exactly the same way:

**steps/shopping_cart_steps.ts**
```typescript
import { Given, When, Then } from "vitest-story";
import { expect } from "vitest";

Given('a user is registered with email "{email}" and password "{password}"', 
  async (ctx, params) => {
    // Implementation
  }
);

When('the user adds a product with id "{productId}" and quantity {quantity} to their cart',
  async (ctx, params) => {
    // Implementation
  }
);
```

### 5. Run your tests

```bash
vitest run stories/shopping-cart.story
# or
vitest run  # runs all tests including .story files
```

## Features

### Full Gherkin Support

- **Feature:** titles for organizing scenarios
- **Background:** steps that run before each scenario
- **Scenario:** individual test cases
- **Multiple scenarios** in one file
- **YAML data blocks** using triple quotes

### Automatic Step Loading

Step definitions are automatically imported from configured `stepsPaths`. No need to manually import them in your .story files.

### Setup Files

Optional `.setup.ts` files are automatically detected and imported. Use them for:
- Database setup/teardown
- Test fixtures
- Global state initialization
- Any other beforeAll/afterAll hooks

### TypeScript Support

While .story files are plain text, the generated code is TypeScript-compatible and integrates seamlessly with your existing test suite.

## Comparison: .story vs Template Literal

### Traditional Template Literal Format
```typescript
// shopping-cart.test.ts
import { story } from "vitest-story";
import "./steps/shopping_cart_steps";

story\`
  Feature: Shopping Cart
  
  Scenario: Add items
    When the user adds a product with id "prod_001" and quantity 2 to their cart
\`();
```

### New .story File Format
```gherkin
# shopping-cart.story
Feature: Shopping Cart

Scenario: Add items
    When the user adds a product with id "prod_001" and quantity 2 to their cart
```

The .story format is simpler and keeps your scenarios in plain text files, making them easier to maintain and share with non-developers.

## Benefits

1. **Simpler syntax** - No need for template literals or function calls
2. **Better separation** - Keep scenarios separate from test code
3. **Easier maintenance** - Plain text files are simpler to edit
4. **Non-developer friendly** - Product owners can write/edit scenarios
5. **Version control friendly** - Cleaner diffs for scenario changes

## Backward Compatibility

The template literal format (`story\`...\`()`) continues to work exactly as before. You can use both formats in the same project.
