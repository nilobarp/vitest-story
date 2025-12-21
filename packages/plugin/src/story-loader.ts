/**
 * Story file loader for .story files
 * Transforms .story files into executable Vitest tests
 */

import { tokenizeFeature } from "./tokenizer.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Transform a .story file content into executable test code
 * @param content - Raw content of .story file
 * @param storyFilePath - Path to the .story file (for error reporting)
 * @returns TypeScript code that can be executed by Vitest
 */
export function transformStoryFile(
  content: string,
  storyFilePath: string
): string {
  // Parse the story file content
  const feature = tokenizeFeature(content);

  if (feature.scenarios.length === 0) {
    throw new Error(
      `[Vitest Story] No scenarios found in story file: ${storyFilePath}`
    );
  }

  // Check if there's a setup file (e.g., shopping-cart.setup.ts for shopping-cart.story)
  const setupFilePath = storyFilePath.replace(/\.story$/, ".setup.ts");
  const setupFileExists = fs.existsSync(setupFilePath);
  
  const setupImport = setupFileExists
    ? `import './${path.basename(setupFilePath)}';`
    : "";

  // Generate TypeScript code that will execute the scenarios
  const code = `
// Auto-generated from ${storyFilePath}
${setupImport}
import { test } from "vitest";
import { executeStoryFromFeature } from "vitest-story";

const featureText = ${JSON.stringify(content)};

executeStoryFromFeature(featureText, test);
`;

  return code;
}
