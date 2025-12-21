import { story } from "vitest-story";

/* *
 * steps are loaded automatically from the configured steps directory in vitest.config.ts
 * see: packages/examples/vitest.config.ts
 */

story`
  Scenario: AI text extraction
    Given I start extracting text
    And AI extracts text from the document:
    """yaml
    document:
      - page: 1
        content: "This is the first page."
      - page: 2
        content: "This is the second page."
    """
    Then the extracted text should be stored
`();
