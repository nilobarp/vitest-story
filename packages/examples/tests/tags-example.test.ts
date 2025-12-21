/**
 * Example of using tags to filter and skip scenarios
 */

import { story } from "vitest-story";

// Step definitions are autoloaded from steps/autoload/calculator_steps.ts

// Story with tags
story`
  @fast
  @calculator
  Feature: Calculator Operations with Tags

  Background:
    Given the calculator is reset
    And I add 10 
  
  @smoke
  Scenario: Addition
    When I add 5
    And I add 3
    Then the result should be 18
  
  @skip
  Scenario: This scenario should be skipped
    When I add 100
    Then the result should be 999
  
  @slow
  Scenario: Subtraction
    When I subtract 3
    Then the result should be 7
`();

// To run only scenarios with specific tags, use:
// VITEST_STORY_TAGS=smoke pnpm test tags-example.test.ts
// This will run only the "Addition" scenario

// To run only fast tests:
// VITEST_STORY_TAGS=fast pnpm test tags-example.test.ts
// This will run all scenarios because the feature has @fast tag

// The scenario with @skip will always be skipped regardless of tag filtering
