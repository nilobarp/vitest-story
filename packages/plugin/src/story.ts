/**
 * Core story template literal implementation
 */

import { tokenize, tokenizeFeature } from "./tokenizer.js";
import {
  findMatchingStep,
  registerStep,
  getAllSteps,
} from "./step-registry.js";
import { parseYaml } from "./yaml-parser.js";
import { Context, StepRegistryCallback, Token } from "./types.js";
import { getHooks } from "./hook-registry.js";
import { getVitestStoryConfig } from "./config.js";

/**
 * Special tag that causes a scenario to be skipped
 */
const SKIP_TAG = "skip";

/**
 * Test runner function type with skip support
 */
export type TestRunner = ((
  title: string,
  fn: () => void | Promise<void>
) => void) & {
  skip?: (title: string, fn: () => void | Promise<void>) => void;
};

/**
 * Execute a list of step tokens
 */
async function executeSteps(
  tokens: Token[],
  ctx: Context
): Promise<void> {
  for (const token of tokens) {
    if (token.type !== "step") {
      continue;
    }

    // Construct full step text (with YAML placeholder if present)
    let fullStepText = token.text;
    if (token.yaml) {
      fullStepText += ":\n" + token.yaml;
    }

    // Find matching step definition
    const matched = findMatchingStep(fullStepText);

    if (!matched) {
      const config = getVitestStoryConfig();

      // Build a suggested step definition snippet for the user to copy/paste
      const suggestion = generateStepSuggestion(token);

      if (config.provideDefaultImplementations) {
        // Provide a default implementation that throws (but include suggestion)
        console.warn(
          `[Vitest Story] No matching step found for: "${token.keyword} ${token.text}" at line ${token.lineNumber}. ` +
            `Using default implementation.\nSuggested step:\n${suggestion}`
        );

        throw new Error(
          `Step not implemented yet: "${token.keyword} ${token.text}" at line ${token.lineNumber}\n` +
            `Please implement this step in your step definitions.\n\nSuggested step to add:\n${suggestion}`
        );
      }

      const availableSteps = getAllStepPatterns()
        .map((p) => `  - ${p}`)
        .join("\n");

      throw new Error(
        `No matching step found for: "${token.keyword} ${token.text}" at line ${token.lineNumber}\n` +
          `Available steps:\n${availableSteps}\n\nSuggested step to add:\n${suggestion}`
      );
    }

    // Parse YAML if present
    const params = { ...matched.params };
    if (token.yaml) {
      try {
        params.yaml = parseYaml(token.yaml);
      } catch (error) {
        throw new Error(
          `Failed to parse YAML in step at line ${token.lineNumber}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Execute the step
    try {
      await matched.definition.handler(ctx, params);
    } catch (error) {
      throw new Error(
        `Step failed: "${token.keyword} ${token.text}"\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Core story execution logic (test-runner agnostic)
 */
export async function executeStory(
  scenarioText: string,
  callback?: StepRegistryCallback
): Promise<void> {
  // Parse the scenario
  const parsed = tokenize(scenarioText);

  if (!parsed.title) {
    throw new Error('Scenario must have a title starting with "Scenario:"');
  }

  // Create context
  const ctx: Context = {};

  // Execute beforeFeature hooks
  const beforeFeatureHooks = getHooks("beforeFeature");
  for (const hook of beforeFeatureHooks) {
    await hook.handler(ctx);
  }

  // Execute beforeScenario hooks
  const beforeScenarioHooks = getHooks("beforeScenario");
  for (const hook of beforeScenarioHooks) {
    await hook.handler(ctx);
  }

  // Register steps via callback if provided
  if (callback) {
    callback({
      step: registerStep,
      ctx,
    });
  }

  // Execute each step token
  await executeSteps(parsed.tokens, ctx);

  // Execute afterScenario hooks
  const afterScenarioHooks = getHooks("afterScenario");
  for (const hook of afterScenarioHooks) {
    await hook.handler(ctx);
  }

  // Execute afterFeature hooks
  const afterFeatureHooks = getHooks("afterFeature");
  for (const hook of afterFeatureHooks) {
    await hook.handler(ctx);
  }
}

/**
 * Check if a scenario should be skipped based on its tags
 */
function shouldSkipScenario(scenarioTags: string[], featureTags: string[]): boolean {
  const config = getVitestStoryConfig();
  const allTags = [...featureTags, ...scenarioTags];
  
  // If scenario or feature has @skip tag, skip it
  if (allTags.includes(SKIP_TAG)) {
    return true;
  }
  
  // If tag filtering is enabled, check if scenario matches
  if (config.tags.length > 0) {
    // Scenario must have at least one of the configured tags
    const hasMatchingTag = allTags.some(tag => config.tags.includes(tag));
    return !hasMatchingTag;
  }
  
  return false;
}

/**
 * Main story template literal function with injectable test runner
 * Returns a function that accepts step registration callback (optional for global steps)
 */
export function createStory(testRunner?: TestRunner) {
  return function story(
    strings: TemplateStringsArray,
    ...values: any[]
  ): (callback?: StepRegistryCallback) => void {
    // Combine template literal parts
    const scenarioText = strings.reduce((acc, str, i) => {
      return acc + str + (values[i] !== undefined ? String(values[i]) : "");
    }, "");

    // Return a function that accepts the step registration callback (optional)
    return (callback?: StepRegistryCallback) => {
      // Try to parse as a feature (with multiple scenarios and background)
      const feature = tokenizeFeature(scenarioText);
      
      if (!testRunner) {
        throw new Error(
          "No test runner provided. Provide a custom test runner using createStory(testRunner)"
        );
      }

      // If there are multiple scenarios, create a test for each
      if (feature.scenarios.length > 1) {
        // Create tests for each scenario
        for (const scenario of feature.scenarios) {
          if (!scenario.title) {
            throw new Error('Each Scenario must have a title');
          }

          // Determine if scenario should be skipped
          const skip = shouldSkipScenario(scenario.tags, feature.featureTags);
          const runner = skip && testRunner.skip ? testRunner.skip : testRunner;

          runner(scenario.title, async () => {
            // Create context
            const ctx: Context = {};

            // Execute beforeFeature hooks
            const beforeFeatureHooks = getHooks("beforeFeature");
            for (const hook of beforeFeatureHooks) {
              await hook.handler(ctx);
            }

            // Execute beforeScenario hooks
            const beforeScenarioHooks = getHooks("beforeScenario");
            for (const hook of beforeScenarioHooks) {
              await hook.handler(ctx);
            }

            // Register steps via callback if provided
            if (callback) {
              callback({
                step: registerStep,
                ctx,
              });
            }

            // Execute background steps
            await executeSteps(feature.backgroundTokens, ctx);

            // Execute scenario steps
            await executeSteps(scenario.tokens, ctx);

            // Execute afterScenario hooks
            const afterScenarioHooks = getHooks("afterScenario");
            for (const hook of afterScenarioHooks) {
              await hook.handler(ctx);
            }

            // Execute afterFeature hooks
            const afterFeatureHooks = getHooks("afterFeature");
            for (const hook of afterFeatureHooks) {
              await hook.handler(ctx);
            }
          });
        }
      } else {
        // Single scenario - use backward compatible logic
        const parsed = tokenize(scenarioText);

        if (!parsed.title) {
          throw new Error('Scenario must have a title starting with "Scenario:"');
        }

        // Determine if scenario should be skipped
        const skip = shouldSkipScenario(parsed.tags, feature.featureTags);
        const runner = skip && testRunner.skip ? testRunner.skip : testRunner;

        // Create test using the provided test runner
        runner(parsed.title, async () => {
          await executeStory(scenarioText, callback);
        });
      }
    };
  };
}

/**
 * Helper to get all registered step patterns for error messages
 */
function getAllStepPatterns(): string[] {
  const steps = getAllSteps();
  return steps.map((s) => s.pattern);
}

/**
 * Generate a suggested step definition snippet for a missing step token
 * Uses simple heuristics to turn quoted strings and numbers into placeholders
 */
function generateStepSuggestion(token: Token): string {
  let pattern = token.text;
  const paramNames: string[] = [];
  let autoIndex = 1;

  // Replace double-quoted substrings with placeholders
  pattern = pattern.replace(/"([^"]+)"/g, (full, inner, offset, str) => {
    // Look back for a contextual word before the quote to name the param
    const before = str.substring(0, offset).trim();
    const beforeMatch = before.match(/(\w+)\s*(?:to|for|with|is|should|be)?\s*$/i);
    let name = beforeMatch ? beforeMatch[1] : inner.split(/\s+/)[0];
    name = name.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || `param${autoIndex++}`;
    if (paramNames.includes(name)) {
      name = `${name}${autoIndex++}`;
    }
    paramNames.push(name);
    return `"{${name}}"`;
  });

  // Replace single-quoted substrings
  pattern = pattern.replace(/'([^']+)'/g, (full, inner, offset, str) => {
    const before = str.substring(0, offset).trim();
    const beforeMatch = before.match(/(\w+)\s*(?:to|for|with|is|should|be)?\s*$/i);
    let name = beforeMatch ? beforeMatch[1] : inner.split(/\s+/)[0];
    name = name.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || `param${autoIndex++}`;
    if (paramNames.includes(name)) {
      name = `${name}${autoIndex++}`;
    }
    paramNames.push(name);
    return `'{${name}}'`;
  });

  // Replace numeric tokens with a {number} placeholder
  pattern = pattern.replace(/\b(\d+)\b/g, (full) => {
    let name = `number${autoIndex++}`;
    paramNames.push(name);
    return `{${name}}`;
  });

  // If the step had a YAML block, append the {yaml} placeholder
  if (token.yaml) {
    // Ensure the pattern ends up with a colon too (common syntax)
    if (!pattern.endsWith(':')) {
      pattern = `${pattern}:`;
    }
    pattern = `${pattern}\n{yaml}`; // tests in repo expect YAML pattern to be on its own line
    paramNames.push('yaml');
  }

  // Build parameter argument for the handler example
  const paramsDestructure = paramNames.length ? `{ ${paramNames.join(', ')} }` : 'params';

  // Escape single quotes in pattern for safe single-quoted JS string
  const safePattern = pattern.replace(/'/g, "\\'");

  const snippet = `step('${safePattern}', async (ctx, ${paramsDestructure}) => {\n  // TODO: implement this step\n});`;

  return snippet;
}

/**
 * Execute a story from feature text (used by .story file loader)
 * @param featureText - The raw feature text content
 * @param testRunner - The test runner function (e.g., Vitest's test)
 */
export function executeStoryFromFeature(
  featureText: string,
  testRunner: TestRunner
): void {
  const feature = tokenizeFeature(featureText);

  if (feature.scenarios.length === 0) {
    throw new Error("No scenarios found in feature");
  }

  // Create tests for each scenario
  for (const scenario of feature.scenarios) {
    if (!scenario.title) {
      throw new Error("Each Scenario must have a title");
    }

    // Determine if scenario should be skipped
    const skip = shouldSkipScenario(scenario.tags, feature.featureTags);
    const runner = skip && testRunner.skip ? testRunner.skip : testRunner;

    runner(scenario.title, async () => {
      // Create context
      const ctx: Context = {};

      // Execute beforeFeature hooks
      const beforeFeatureHooks = getHooks("beforeFeature");
      for (const hook of beforeFeatureHooks) {
        await hook.handler(ctx);
      }

      // Execute beforeScenario hooks
      const beforeScenarioHooks = getHooks("beforeScenario");
      for (const hook of beforeScenarioHooks) {
        await hook.handler(ctx);
      }

      // Execute background steps
      await executeSteps(feature.backgroundTokens, ctx);

      // Execute scenario steps
      await executeSteps(scenario.tokens, ctx);

      // Execute afterScenario hooks
      const afterScenarioHooks = getHooks("afterScenario");
      for (const hook of afterScenarioHooks) {
        await hook.handler(ctx);
      }

      // Execute afterFeature hooks
      const afterFeatureHooks = getHooks("afterFeature");
      for (const hook of afterFeatureHooks) {
        await hook.handler(ctx);
      }
    });
  }
}

/**
 * Export convenience function for step registration
 */
export function step(
  pattern: string,
  handler: (ctx: Context, params: Record<string, any>) => void | Promise<void>
): void {
  registerStep(pattern, handler);
}
