import { describe, it, expect, vi } from "vitest";

// Mock vscode module so importing test-controller doesn't fail in the test environment
vi.mock("vscode", () => ({}));

import { processTestResultsForTest } from "./test-controller";

describe("processTestResultsForTest", () => {
  it("marks passed scenarios and their steps as passed (including nested feature)", () => {
    // Create fake step
    const step = { label: "Then the result should be 18", range: { start: { line: 6 } } };

    // Scenario item with children.forEach
    const scenario = {
      label: "Addition",
      children: { forEach: (cb: any) => [step].forEach(cb) },
    };

    // Feature item containing scenario
    const feature = {
      label: "Calculator Operations",
      children: { forEach: (cb: any) => [scenario].forEach(cb) },
    };

    // File item containing feature
    const fileItem = { children: { forEach: (cb: any) => [feature].forEach(cb) } };
    const result = {
      testResults: [
        {
          assertionResults: [
            { title: "Addition", status: "passed", failureMessages: [] },
          ],
        },
      ],
    };

    const run = {
      passed: vi.fn(),
      failed: vi.fn(),
    };

    processTestResultsForTest(result, fileItem, run);

    expect(run.passed).toHaveBeenCalledWith(scenario);
    expect(run.passed).toHaveBeenCalledWith(step);
    expect(run.failed).not.toHaveBeenCalled();
  });

  it("marks failed scenario when failure message can't identify step", () => {
    const step = { label: "Then the result should be 18", range: { start: { line: 6 } } };

    const scenario = {
      label: "Addition",
      children: { forEach: (cb: any) => [step].forEach(cb) },
    };

    const feature = {
      label: "Calculator Operations",
      children: { forEach: (cb: any) => [scenario].forEach(cb) },
    };

    const fileItem = { children: { forEach: (cb: any) => [feature].forEach(cb) } };

    const result = {
      testResults: [
        {
          assertionResults: [
            {
              title: "Addition",
              status: "failed",
              failureMessages: ["Some error without step info"],
            },
          ],
        },
      ],
    };

    const run = {
      passed: vi.fn(),
      failed: vi.fn(),
    };

    processTestResultsForTest(result, fileItem, run);

    expect(run.failed).toHaveBeenCalled();
    expect(run.passed).not.toHaveBeenCalled();
  });
});