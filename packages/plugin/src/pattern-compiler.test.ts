import { describe, it, expect } from "vitest";
import { compilePattern } from "./pattern-compiler";

describe("patternCompiler", () => {
  it("should compile simple pattern without placeholders", () => {
    const { regex, paramNames } = compilePattern("I do something");
    expect(paramNames).toEqual([]);
    expect(regex.test("I do something")).toBe(true);
    expect(regex.test("I do something else")).toBe(false);
  });

  it("should compile pattern with single placeholder", () => {
    const { regex, paramNames } = compilePattern("I visit {page}");
    expect(paramNames).toEqual(["page"]);
    expect(regex.test("I visit homepage")).toBe(true);

    const match = "I visit homepage".match(regex);
    expect(match?.[1]).toBe("homepage");
  });

  it("should compile pattern with multiple placeholders", () => {
    const { regex, paramNames } = compilePattern("I set {key} to {value}");
    expect(paramNames).toEqual(["key", "value"]);

    const match = "I set username to john".match(regex);
    expect(match?.[1]).toBe("username");
    expect(match?.[2]).toBe("john");
  });

  it("should compile pattern with quoted strings", () => {
    const { regex, paramNames } = compilePattern(
      'AI extracts prices for "{company}"'
    );
    expect(paramNames).toEqual(["company"]);

    const match = 'AI extracts prices for "Tim\'s Cabinetry"'.match(regex);
    expect(match?.[1]).toBe("Tim's Cabinetry");
  });

  it("should compile pattern with yaml placeholder", () => {
    const { regex, paramNames } = compilePattern(
      'AI extracts prices for "{company}":\n{yaml}'
    );
    expect(paramNames).toEqual(["company", "yaml"]);

    const testText =
      'AI extracts prices for "ACME Corp":\nkey: value\nfoo: bar';
    const match = testText.match(regex);
    expect(match?.[1]).toBe("ACME Corp");
    expect(match?.[2]).toContain("key: value");
  });

  it("should escape special regex characters", () => {
    const { regex } = compilePattern("I click the (button)");
    expect(regex.test("I click the (button)")).toBe(true);
    expect(regex.test("I click the button")).toBe(false);
  });
});
