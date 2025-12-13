import { story } from "@vitest-story/plugin";

/* *
 * steps are loaded automatically from the configured steps directory in vitest.config.ts
 * see: packages/examples/vitest.config.ts
 */

story`
  Scenario: AI text extraction
    Given I start extracting text
    And AI extracts text from the document
    Then the extracted text should be stored
`();
