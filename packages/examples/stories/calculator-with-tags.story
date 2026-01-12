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

@skip
Scenario: This test is skipped
    When I add 100
    Then the result should be 9999

@slow
Scenario: Subtraction
    When I subtract 3
    Then the result should be 7
