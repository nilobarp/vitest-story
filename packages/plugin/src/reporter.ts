/**
 * Custom Vitest reporter for Story scenarios
 * Displays test results in tree format with individual steps shown
 */

import type { Reporter } from "vitest/reporters";
import type { TestCase, TestModule } from "vitest/node";

export interface StepExecution {
  keyword: string;
  text: string;
  state: "passed" | "failed";
  duration: number;
  error?: Error;
}

/**
 * Story reporter that shows each step of the scenario
 */
export class StoryReporter implements Reporter {
  onTestModuleEnd(testModule: TestModule) {
    const state = testModule.state();
    const diagnostic = testModule.diagnostic();
    const duration = diagnostic.duration;

    // Count tests
    const allTests = Array.from(testModule.children.allTests());
    const passed = allTests.filter((t) => t.result()?.state === "passed").length;
    const failed = allTests.filter((t) => t.result()?.state === "failed").length;
    const skipped = allTests.filter(
      (t) => t.result()?.state === "skipped"
    ).length;

    // Module header
    const icon = state === "passed" ? "✓" : state === "failed" ? "✗" : "○";
    const testCount = `${allTests.length} test${allTests.length !== 1 ? "s" : ""}`;
    console.log(
      `\n ${icon} ${testModule.moduleId} (${testCount}) ${duration}ms`
    );

    // Show each test with its steps
    for (const test of testModule.children.allTests()) {
      this.printTestCase(test as TestCase);
    }
  }

  private printTestCase(testCase: TestCase) {
    const result = testCase.result();
    const diagnostic = testCase.diagnostic();
    const state = result?.state || "pending";
    const duration = diagnostic?.duration || 0;

    // Test header
    const icon = state === "passed" ? "✓" : state === "failed" ? "✗" : "○";
    const testName = testCase.name;
    console.log(`   ${icon} ${testName} ${duration}ms`);

    // Get step executions from task meta
    const meta = testCase.meta() as any;
    const steps = meta.storySteps as StepExecution[] | undefined;

    if (steps && steps.length > 0) {
      // Print each step
      for (const step of steps) {
        const stepIcon = step.state === "passed" ? "✓" : "✗";
        const stepText = `${step.keyword} ${step.text}`;
        console.log(`        ${stepIcon} ${stepText} ${step.duration}ms`);
      }
    }
  }

  onTestRunEnd() {
    // Add a newline at the end for clean output
    console.log("");
  }
}
