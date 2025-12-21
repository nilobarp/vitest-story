import { expect, describe, it, beforeEach } from "vitest";
import { createStory } from "./story";
import { clearSteps, clearHooks, Given, When, Then } from "./index";
import { configureVitestStory } from "./config";

describe("Tag Support", () => {
  beforeEach(() => {
    clearSteps();
    clearHooks();
    // Reset configuration
    configureVitestStory({
      provideDefaultImplementations: true,
      warnOnDuplicates: true,
      tags: [],
    });
  });

  describe("@skip tag", () => {
    it("should skip scenario with @skip tag", () => {
      const tests: Array<{ title: string; skipped: boolean }> = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push({ title, skipped: false });
        fn();
      }) as any;
      
      mockTest.skip = (title: string, fn: () => void) => {
        tests.push({ title, skipped: true });
      };

      const story = createStory(mockTest);

      Given("I have a calculator", (ctx) => {
        ctx.calculator = { value: 0 };
      });

      story`
        Feature: Calculator
        
        @skip
        Scenario: Skipped Addition
          Given I have a calculator
        
        Scenario: Normal Addition
          Given I have a calculator
      `();

      expect(tests).toHaveLength(2);
      expect(tests[0].title).toBe("Skipped Addition");
      expect(tests[0].skipped).toBe(true);
      expect(tests[1].title).toBe("Normal Addition");
      expect(tests[1].skipped).toBe(false);
    });

    it("should skip all scenarios when feature has @skip tag", () => {
      const tests: Array<{ title: string; skipped: boolean }> = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push({ title, skipped: false });
        fn();
      }) as any;
      
      mockTest.skip = (title: string, fn: () => void) => {
        tests.push({ title, skipped: true });
      };

      const story = createStory(mockTest);

      Given("I have a calculator", (ctx) => {
        ctx.calculator = { value: 0 };
      });

      story`
        @skip
        Feature: Calculator
        
        Scenario: Addition
          Given I have a calculator
        
        Scenario: Subtraction
          Given I have a calculator
      `();

      expect(tests).toHaveLength(2);
      expect(tests[0].skipped).toBe(true);
      expect(tests[1].skipped).toBe(true);
    });

    it("should skip single scenario with @skip tag", () => {
      const tests: Array<{ title: string; skipped: boolean }> = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push({ title, skipped: false });
        fn();
      }) as any;
      
      mockTest.skip = (title: string, fn: () => void) => {
        tests.push({ title, skipped: true });
      };

      const story = createStory(mockTest);

      Given("I have a calculator", (ctx) => {
        ctx.calculator = { value: 0 };
      });

      story`
        @skip
        Scenario: Skipped Test
          Given I have a calculator
      `();

      expect(tests).toHaveLength(1);
      expect(tests[0].skipped).toBe(true);
    });
  });

  describe("tag filtering", () => {
    it("should run only scenarios with specified tags", () => {
      const tests: string[] = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push(title);
        fn();
      }) as any;
      
      mockTest.skip = (title: string) => {
        // Skipped tests are not added to the list
      };

      configureVitestStory({ tags: ["fast"] });

      const story = createStory(mockTest);

      Given("I start", () => {});

      story`
        Feature: Calculator
        
        @fast
        Scenario: Fast test
          Given I start
        
        @slow
        Scenario: Slow test
          Given I start
        
        Scenario: Untagged test
          Given I start
      `();

      expect(tests).toEqual(["Fast test"]);
    });

    it("should run scenarios matching any of the specified tags", () => {
      const tests: string[] = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push(title);
        fn();
      }) as any;
      
      mockTest.skip = (title: string) => {
        // Skipped tests are not added
      };

      configureVitestStory({ tags: ["fast", "smoke"] });

      const story = createStory(mockTest);

      Given("I start", () => {});

      story`
        Feature: Calculator
        
        @fast
        Scenario: Fast test
          Given I start
        
        @smoke
        Scenario: Smoke test
          Given I start
        
        @regression
        Scenario: Regression test
          Given I start
      `();

      expect(tests).toContain("Fast test");
      expect(tests).toContain("Smoke test");
      expect(tests).not.toContain("Regression test");
    });

    it("should consider feature tags when filtering", () => {
      const tests: string[] = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push(title);
        fn();
      }) as any;
      
      mockTest.skip = (title: string) => {
        // Skipped tests are not added
      };

      configureVitestStory({ tags: ["fast"] });

      const story = createStory(mockTest);

      Given("I start", () => {});

      story`
        @fast
        Feature: Calculator
        
        Scenario: Test 1
          Given I start
        
        Scenario: Test 2
          Given I start
      `();

      // All scenarios should run because feature has @fast tag
      expect(tests).toEqual(["Test 1", "Test 2"]);
    });

    it("should combine scenario and feature tags for filtering", () => {
      const tests: string[] = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push(title);
        fn();
      }) as any;
      
      mockTest.skip = (title: string) => {
        // Skipped tests are not added
      };

      configureVitestStory({ tags: ["smoke"] });

      const story = createStory(mockTest);

      Given("I start", () => {});

      story`
        @fast
        Feature: Calculator
        
        @smoke
        Scenario: Test with smoke tag
          Given I start
        
        Scenario: Test without matching tag
          Given I start
      `();

      // Only the scenario with @smoke should run
      expect(tests).toEqual(["Test with smoke tag"]);
    });
  });

  describe("multiple tags on same line", () => {
    it("should parse multiple tags on single line", () => {
      const tests: string[] = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push(title);
        fn();
      }) as any;
      
      mockTest.skip = (title: string) => {
        // Skipped
      };

      configureVitestStory({ tags: ["fast"] });

      const story = createStory(mockTest);

      Given("I start", () => {});

      story`
        Feature: Calculator
        
        @fast @smoke
        Scenario: Multi-tagged test
          Given I start
      `();

      expect(tests).toContain("Multi-tagged test");
    });
  });

  describe("tag priority", () => {
    it("@skip tag should take priority over tag filtering", () => {
      const tests: string[] = [];
      
      const mockTest = ((title: string, fn: () => void) => {
        tests.push(title);
        fn();
      }) as any;
      
      mockTest.skip = (title: string) => {
        // Skipped - don't add to tests
      };

      configureVitestStory({ tags: ["fast"] });

      const story = createStory(mockTest);

      Given("I start", () => {});

      story`
        Feature: Calculator
        
        @fast @skip
        Scenario: Fast but skipped
          Given I start
      `();

      // Should be skipped despite having @fast tag
      expect(tests).toHaveLength(0);
    });
  });
});
