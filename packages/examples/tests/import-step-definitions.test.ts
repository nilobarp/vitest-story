import { story } from "@vitest-story/plugin";

// Import step definitions to register them
import "./steps/common_steps";

// Using global steps without inline definitions
story`
  Scenario: Counter with global steps
    Given counter starts at 0
    When I increment counter
    And I increment counter
    Then counter is 2
`();

story`
  Scenario: Setting values with global steps
    Given I set name to "Alice"
    Then name should be "Alice"
`();

// Using global steps with different parameters
story`
  Scenario: Counter increment by amount
    Given counter starts at 10
    When I increment counter by 5
    Then counter is 15
`();

// Using state management steps
story`
  Scenario: State management
    Given I have a starting state
    When I perform an action
    Then I see a result
`();
