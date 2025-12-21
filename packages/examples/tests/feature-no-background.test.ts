/**
 * Test Feature with multiple scenarios but no Background
 */

import { story, Given, When, Then } from "vitest-story";

story`
  Scenario: Addition
    Given the calculator is reset
    When I add 5
    And I add 3
    Then the result should be 8
`();
