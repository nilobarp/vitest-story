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
 * Test runner function type
 */
export type TestRunner = (
  title: string,
  fn: () => void | Promise<void>
) => void;

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

      if (config.provideDefaultImplementations) {
        // Provide a default implementation that throws
        console.warn(
          `[Vitest Story] No matching step found for: "${token.keyword} ${token.text}" at line ${token.lineNumber}. ` +
            `Using default implementation.`
        );

        throw new Error(
          `Step not implemented yet: "${token.keyword} ${token.text}" at line ${token.lineNumber}\n` +
            `Please implement this step in your step definitions.`
        );
      }

      const availableSteps = getAllStepPatterns()
        .map((p) => `  - ${p}`)
        .join("\n");

      throw new Error(
        `No matching step found for: "${token.keyword} ${token.text}" at line ${token.lineNumber}\n` +
          `Available steps:\n${availableSteps}`
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

          testRunner(scenario.title, async () => {
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

        // Create test using the provided test runner
        testRunner(parsed.title, async () => {
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
 * Export convenience function for step registration
 */
export function step(
  pattern: string,
  handler: (ctx: Context, params: Record<string, any>) => void | Promise<void>
): void {
  registerStep(pattern, handler);
}
