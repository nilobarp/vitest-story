import { describe, it, expect } from "vitest";
import { tokenize, tokenizeFeature } from "./tokenizer";

describe("tokenizer", () => {
  it("should parse scenario title", () => {
    const text = `
      Scenario: User logs in
        Given I am on the login page
    `;

    const parsed = tokenize(text);
    expect(parsed.title).toBe("User logs in");
  });

  it("should parse simple steps", () => {
    const text = `
      Scenario: Simple test
        Given I have a starting state
        When I perform an action
        Then I see a result
    `;

    const parsed = tokenize(text);
    expect(parsed.tokens).toHaveLength(3);
    expect(parsed.tokens[0].keyword).toBe("Given");
    expect(parsed.tokens[0].text).toBe("I have a starting state");
    expect(parsed.tokens[1].keyword).toBe("When");
    expect(parsed.tokens[2].keyword).toBe("Then");
  });

  it("should handle And keywords", () => {
    const text = `
      Scenario: Multiple steps
        Given I do something
        And I do something else
        When I trigger action
        And I wait
    `;

    const parsed = tokenize(text);
    expect(parsed.tokens).toHaveLength(4);
    expect(parsed.tokens[1].keyword).toBe("And");
    expect(parsed.tokens[1].text).toBe("I do something else");
  });

  it("should parse triple-quote YAML blocks", () => {
    const text = `
      Scenario: YAML test
        Given I have data:
          """yaml
          name: John
          age: 30
          """
        Then I verify it
    `;

    const parsed = tokenize(text);
    expect(parsed.tokens).toHaveLength(2);
    expect(parsed.tokens[0].yaml).toContain("name: John");
    expect(parsed.tokens[0].yaml).toContain("age: 30");
  });

  it("should parse indented YAML blocks", () => {
    const text = `
      Scenario: Indented YAML
        Given I configure settings:
          timeout: 5000
          retries: 3
        Then I proceed
    `;

    const parsed = tokenize(text);
    expect(parsed.tokens).toHaveLength(2);
    expect(parsed.tokens[0].text).toBe("I configure settings");
    expect(parsed.tokens[0].yaml).toContain("timeout: 5000");
    expect(parsed.tokens[0].yaml).toContain("retries: 3");
  });

  it("should handle steps without YAML", () => {
    const text = `
      Scenario: No YAML
        Given I start
        When I continue
        Then I finish
    `;

    const parsed = tokenize(text);
    expect(parsed.tokens.every((t) => !t.yaml)).toBe(true);
  });

  it("should track line numbers", () => {
    const text = `
      Scenario: Line tracking
        Given I am on line 2
        When I am on line 3
    `;

    const parsed = tokenize(text);
    expect(parsed.tokens[0].lineNumber).toBeGreaterThan(0);
    expect(parsed.tokens[1].lineNumber).toBeGreaterThan(
      parsed.tokens[0].lineNumber
    );
  });
});

describe("tokenizeFeature", () => {
  it("should parse feature title", () => {
    const text = `
      Feature: Shopping Cart
      
      Scenario: Add items
        Given I have an empty cart
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.featureTitle).toBe("Shopping Cart");
  });

  it("should parse background section", () => {
    const text = `
      Feature: Shopping Cart
      
      Background:
        Given a database is running
        And a user is logged in
      
      Scenario: Add items
        When I add an item
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.backgroundTokens).toHaveLength(2);
    expect(parsed.backgroundTokens[0].text).toBe("a database is running");
    expect(parsed.backgroundTokens[1].text).toBe("a user is logged in");
  });

  it("should parse multiple scenarios", () => {
    const text = `
      Feature: Shopping Cart
      
      Scenario: Add items
        Given I have an empty cart
        When I add an item
      
      Scenario: Remove items
        Given I have items in cart
        When I remove an item
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.scenarios).toHaveLength(2);
    expect(parsed.scenarios[0].title).toBe("Add items");
    expect(parsed.scenarios[1].title).toBe("Remove items");
  });

  it("should parse background and multiple scenarios", () => {
    const text = `
      Feature: Shopping Cart
      
      Background:
        Given a database is running
      
      Scenario: Add items
        When I add an item
      
      Scenario: Remove items
        When I remove an item
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.backgroundTokens).toHaveLength(1);
    expect(parsed.scenarios).toHaveLength(2);
  });

  it("should handle YAML in background steps", () => {
    const text = `
      Feature: Shopping Cart
      
      Background:
        Given I have config:
          """yaml
          timeout: 5000
          """
      
      Scenario: Test scenario
        When I do something
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.backgroundTokens).toHaveLength(1);
    expect(parsed.backgroundTokens[0].yaml).toContain("timeout: 5000");
  });

  it("should handle YAML in scenario steps with background", () => {
    const text = `
      Feature: Shopping Cart
      
      Background:
        Given a user is logged in
      
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
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.scenarios).toHaveLength(1);
    expect(parsed.scenarios[0].tokens).toHaveLength(4);
    expect(parsed.scenarios[0].tokens[2].yaml).toContain("Oak Wood");
    expect(parsed.scenarios[0].tokens[2].yaml).toContain("Pine Wood");
  });

  it("should handle feature without background", () => {
    const text = `
      Feature: Simple Feature
      
      Scenario: First scenario
        Given I start
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.backgroundTokens).toHaveLength(0);
    expect(parsed.scenarios).toHaveLength(1);
  });

  it("should handle feature without feature title", () => {
    const text = `
      Scenario: Simple scenario
        Given I start
    `;

    const parsed = tokenizeFeature(text);
    expect(parsed.featureTitle).toBeNull();
    expect(parsed.scenarios).toHaveLength(1);
  });
});
