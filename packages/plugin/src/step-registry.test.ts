import { describe, it, expect, beforeEach } from "vitest";
import {
  registerStep,
  findMatchingStep,
  clearSteps,
  getAllSteps,
} from "../src/step-registry";

describe("stepRegistry", () => {
  beforeEach(() => {
    clearSteps();
  });

  it("should register and find simple steps", () => {
    registerStep("I do something", async (ctx) => {
      ctx.done = true;
    });

    const matched = findMatchingStep("I do something");
    expect(matched).not.toBeNull();
    expect(matched?.definition.pattern).toBe("I do something");
  });

  it("should extract parameters from matched steps", () => {
    registerStep("I visit {page}", async (ctx, params) => {
      ctx.page = params.page;
    });

    const matched = findMatchingStep("I visit homepage");
    expect(matched).not.toBeNull();
    expect(matched?.params.page).toBe("homepage");
  });

  it("should handle multiple parameters", () => {
    registerStep("I set {key} to {value}", async (ctx, params) => {
      ctx[params.key] = params.value;
    });

    const matched = findMatchingStep("I set username to john");
    expect(matched).not.toBeNull();
    expect(matched?.params.key).toBe("username");
    expect(matched?.params.value).toBe("john");
  });

  it("should return null for unmatched steps", () => {
    registerStep("I do something", async () => {});

    const matched = findMatchingStep("I do something else");
    expect(matched).toBeNull();
  });

  it("should clear all steps", () => {
    registerStep("Step 1", async () => {});
    registerStep("Step 2", async () => {});

    expect(getAllSteps()).toHaveLength(2);
    clearSteps();
    expect(getAllSteps()).toHaveLength(0);
  });

  it("should match first matching pattern", () => {
    registerStep("I do {action}", async (ctx, params) => {
      ctx.version = 1;
    });
    registerStep("I do something", async (ctx) => {
      ctx.version = 2;
    });

    const matched = findMatchingStep("I do something");
    // Should match the first pattern registered
    expect(matched?.definition.pattern).toBe("I do {action}");
  });

  it("should handle quoted parameters", () => {
    registerStep('AI extracts prices for "{company}"', async (ctx, params) => {
      ctx.company = params.company;
    });

    const matched = findMatchingStep(
      'AI extracts prices for "Tim\'s Cabinetry"'
    );
    expect(matched).not.toBeNull();
    expect(matched?.params.company).toBe("Tim's Cabinetry");
  });
});
