# Vitest Story Extension

A VS Code extension that enhances your development experience when working with [vitest-story](https://github.com/nilobarp/vitest-story) - a lightweight BDD framework built on top of Vitest.

## Features

### 🧪 Test Explorer Integration

The extension automatically discovers and displays your Vitest Story scenarios in the VS Code Test Explorer. You can:
- View all scenarios organized by file
- See individual steps within each scenario
- Run individual scenarios or entire test files
- Debug scenarios with breakpoint support

### 🔍 Go to Step Definition (Cmd/Ctrl+Click)

**Navigate from story steps to their implementations with a single click!**

When writing stories, you can now Cmd+Click (Mac) or Ctrl+Click (Windows/Linux) on any step in your story template literal to jump directly to where that step is defined.

```typescript
story`
  Scenario: User login
    Given I am on the login page    ← Cmd/Ctrl+Click to jump to definition
    When I enter valid credentials
    Then I should see the dashboard
`();
```

The extension intelligently matches step patterns, including those with parameters:
- Simple patterns: `Given I am logged in`
- With placeholders: `Given my account balance is {int}`
- With string parameters: `When I add {string} to the cart`

### 🔄 Real-time Test Discovery

The extension watches for changes in your test files and automatically updates the test explorer as you write code.

## Installation

### From VS Code Marketplace (Coming Soon)

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Vitest Story"
4. Click Install

### From VSIX File

1. Download the latest `.vsix` file from the [releases page](https://github.com/nilobarp/vitest-story/releases)
2. In VS Code, open the Extensions view
3. Click the "..." menu at the top
4. Select "Install from VSIX..."
5. Choose the downloaded `.vsix` file

## Usage

### Setting Up Your Project

First, install vitest-story in your project:

```bash
npm install -D vitest vitest-story
# or
pnpm add -D vitest vitest-story
```

### Writing Stories

Create a test file (e.g., `login.test.ts`):

```typescript
import { story, Given, When, Then } from "vitest-story";
import { expect } from "vitest";

// Define your steps
Given("I am on the login page", (ctx) => {
  ctx.page = "/login";
});

When("I enter valid credentials", (ctx) => {
  ctx.authenticated = true;
});

Then("I should see the dashboard", (ctx) => {
  expect(ctx.page).toBe("/login");
  expect(ctx.authenticated).toBe(true);
});

// Write your story
story`
  Feature: User Authentication

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should see the dashboard
`();
```

### Using the Extension

1. **View Tests**: Open the Test Explorer (beaker icon in the sidebar)
2. **Run Tests**: Click the play button next to any scenario or file
3. **Debug Tests**: Click the debug button to run tests with breakpoints
4. **Navigate**: Cmd/Ctrl+Click on any step to jump to its definition

## Extension Settings

Currently, this extension works out of the box with no configuration required. It automatically detects files matching `**/*.{test,spec}.{ts,js}` patterns.

## Requirements

- VS Code version 1.85.0 or higher
- Node.js and npm/pnpm installed in your project
- Vitest and vitest-story installed as dependencies

## Known Issues

- The extension currently expects `pnpm` as the package manager. Support for npm/yarn is coming soon.
- Step navigation works best when step definitions are in the same workspace.

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/nilobarp/vitest-story).

## License

MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## More Information

- [Vitest Story Library Documentation](../plugin/README.md)
- [GitHub Repository](https://github.com/nilobarp/vitest-story)
- [Report Issues](https://github.com/nilobarp/vitest-story/issues)

---

**Enjoy writing behavioral tests with vitest-story!** 🚀
