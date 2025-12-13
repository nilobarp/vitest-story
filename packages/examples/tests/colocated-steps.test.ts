import { expect, beforeEach } from "vitest";
import { story, clearSteps } from "@vitest-story/plugin";

// Mock state
interface AppState {
  extractionStarted: boolean;
  featureFlags: Record<string, boolean>;
  companies: Map<string, { name: string; prices: any; extracted: boolean }>;
}

const appState: AppState = {
  extractionStarted: false,
  featureFlags: {},
  companies: new Map(),
};

beforeEach(() => {
  // Reset state before each scenario
  appState.extractionStarted = false;
  appState.featureFlags = {};
  appState.companies.clear();
  clearSteps();
});

// Real-world scenario from the specification
story`
  Scenario: Prices extract independently when feature flag is enabled
    Given I start extracting prices
    And the "USE_EXTRACTION_DATA_MODEL" feature flag is enabled
    And AI extracts prices for "Tim's Cabinetry":
      """yaml
      materials:
        - name: Oak Wood
          price: 150.00
          unit: board_foot
        - name: Pine Wood
          price: 80.00
          unit: board_foot
      labor:
        hourly_rate: 75.00
        minimum_hours: 2
      """
    Then "Tim's Cabinetry" has prices extracted
`(({ step }) => {
  step("I start extracting prices", (ctx) => {
    appState.extractionStarted = true;
    ctx.extractionStarted = true;
  });

  step('the "{flag}" feature flag is enabled', (ctx, params) => {
    appState.featureFlags[params.flag] = true;
    ctx.featureFlags = appState.featureFlags;
  });

  step('AI extracts prices for "{company}":{yaml}', (ctx, params) => {
    const company = {
      name: params.company,
      prices: params.yaml,
      extracted: true,
    };

    appState.companies.set(params.company, company);
    ctx.currentCompany = company;
  });

  step('"{company}" has prices extracted', (ctx, params) => {
    const company = appState.companies.get(params.company);
    expect(company).toBeDefined();
    expect(company?.extracted).toBe(true);
    expect(company?.prices.materials).toHaveLength(2);
    expect(company?.prices.materials[0].name).toBe("Oak Wood");
    expect(company?.prices.labor.hourly_rate).toBe(75.0);
  });
});

// Additional example: E-commerce shopping cart
story`
  Scenario: User adds items to cart and checks out
    Given I am a logged in user
    And my cart is empty
    When I add product "Laptop" with quantity 1
    And I add product "Mouse" with quantity 2
    Then my cart should contain 3 items
    And the total should be "$1299.98"
`(({ step }) => {
  step("I am a logged in user", (ctx) => {
    ctx.user = { id: 1, name: "John Doe", loggedIn: true };
  });

  step("my cart is empty", (ctx) => {
    ctx.cart = { items: [], total: 0 };
  });

  step('I add product "{product}" with quantity {quantity}', (ctx, params) => {
    const prices: Record<string, number> = {
      Laptop: 1200.0,
      Mouse: 49.99,
    };

    const item = {
      product: params.product,
      quantity: parseInt(params.quantity),
      price: prices[params.product] || 0,
    };

    ctx.cart.items.push(item);
  });

  step("my cart should contain {count} items", (ctx, params) => {
    const totalItems = ctx.cart.items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );
    expect(totalItems).toBe(parseInt(params.count));
  });

  step('the total should be "{amount}"', (ctx, params) => {
    const total = ctx.cart.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );
    const expectedAmount = parseFloat(params.amount.replace("$", ""));
    expect(total.toFixed(2)).toBe(expectedAmount.toFixed(2));
  });
});

// Example with async operations
story`
  Scenario: API call with retry logic
    Given I have an API endpoint "/users"
    When I make a request with retry count 3
    Then the request should eventually succeed
    And the response should contain user data
`(({ step }) => {
  step('I have an API endpoint "{endpoint}"', (ctx, params) => {
    ctx.endpoint = params.endpoint;
    ctx.attemptCount = 0;
  });

  step("I make a request with retry count {retries}", async (ctx, params) => {
    ctx.maxRetries = parseInt(params.retries);

    // Simulate API call with retries
    for (let i = 0; i <= ctx.maxRetries; i++) {
      ctx.attemptCount++;

      // Simulate success on 3rd attempt
      if (i === 2) {
        ctx.response = {
          status: 200,
          data: { users: [{ id: 1, name: "Alice" }] },
        };
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  step("the request should eventually succeed", (ctx) => {
    expect(ctx.response.status).toBe(200);
    expect(ctx.attemptCount).toBeGreaterThan(1);
  });

  step("the response should contain user data", (ctx) => {
    expect(ctx.response.data.users).toHaveLength(1);
    expect(ctx.response.data.users[0].name).toBe("Alice");
  });
});
