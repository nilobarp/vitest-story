import { describe, it, expect } from "vitest";
import { tokenize } from "./tokenizer";

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
