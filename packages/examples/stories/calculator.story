Feature: Calculator Operations

Background:
    Given the calculator is reset
    And I add 10 
  
Scenario: Addition
    
    When I add 5
    And I add 3
    Then the result should be 18
  
Scenario: Subtraction
    When I add 10
    And I subtract 3
    Then the result should be 17
