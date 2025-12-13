import { describe, it, expect } from "vitest";
import { parseYaml, isValidYaml } from "./yaml-parser";

describe("yamlParser", () => {
  it("should parse simple YAML", () => {
    const yaml = "name: John\nage: 30";
    const result = parseYaml(yaml);

    expect(result).toEqual({
      name: "John",
      age: 30,
    });
  });

  it("should parse nested YAML", () => {
    const yaml = `
user:
  name: John
  address:
    city: NYC
    zip: 10001
`;
    const result = parseYaml(yaml);

    expect(result.user.name).toBe("John");
    expect(result.user.address.city).toBe("NYC");
    expect(result.user.address.zip).toBe(10001);
  });

  it("should parse YAML arrays", () => {
    const yaml = `
items:
  - apple
  - banana
  - orange
`;
    const result = parseYaml(yaml);

    expect(result.items).toEqual(["apple", "banana", "orange"]);
  });

  it("should throw error for invalid YAML", () => {
    const yaml = "invalid: yaml: content: :";

    expect(() => parseYaml(yaml)).toThrow();
  });

  it("should validate YAML", () => {
    expect(isValidYaml("name: John")).toBe(true);
    expect(isValidYaml("invalid: : :")).toBe(false);
  });

  it("should parse empty YAML as undefined", () => {
    const result = parseYaml("");
    expect(result).toBeUndefined();
  });

  it("should handle multiline strings", () => {
    const yaml = `
description: |
  This is a
  multiline
  description
`;
    const result = parseYaml(yaml);
    expect(result.description).toContain("This is a");
    expect(result.description).toContain("multiline");
  });
});
