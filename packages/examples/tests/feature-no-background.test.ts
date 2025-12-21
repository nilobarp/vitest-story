/**
 * Test Feature with multiple scenarios but no Background
 */

import { story, Given, When, Then } from "vitest-story";

story`
  Feature: Calculator Operations
  
  Scenario: Addition
    Given the calculator is reset
    When I add 5
    And I add 3
    Then the result should be 8
  
  Scenario: Subtraction
    Given the calculator is reset
    When I add 10
    And I subtract 3
    Then the result should be 7
  
  Scenario: Mixed operations
    Given the calculator is reset
    When I add 20
    And I subtract 5
    And I add 10
    Then the result should be 25
`();
