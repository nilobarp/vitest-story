@fast
@calculator

Feature: Calculator Operations

Background:
    Given the calculator is reset
    And I add 10 
  
Scenario: Addition
    When I add 5
    And I add 3
    Then the result should be 18
    But the result should not be 20
    And the result wont be 19
  
Scenario: Subtraction
    When I add 10
    And I subtract 3
    Then the result should be 17

Scenario: Multi step
    When I add 4
    And I add 2
    Then the result should be 16