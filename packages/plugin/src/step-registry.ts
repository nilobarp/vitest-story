/**
 * Global step registry for storing step definitions
 */

import { StepDefinition, StepFunction } from "./types.js";
import { compilePattern } from "./pattern-compiler.js";
import { getVitestStoryConfig } from "./config.js";

/**
 * Global registry of step definitions
 */
const globalSteps: StepDefinition[] = [];

/**
 * Register a new step definition
 * @param pattern - Step pattern with placeholders like {variable}
 * @param handler - Function to execute when step matches
 * @param options - Registration options
 */
export function registerStep(
  pattern: string,
  handler: StepFunction,
  options?: { silent?: boolean }
): void {
  const compiled = compilePattern(pattern);
  const config = getVitestStoryConfig();

  // Check for existing step with the same pattern
  const existingIndex = globalSteps.findIndex(
    (step) => step.pattern === pattern
  );

  if (existingIndex >= 0) {
    // Duplicate found - warn and replace (last one wins)
    if (!options?.silent && config.warnOnDuplicates) {
      console.warn(
        `[Vitest Story] Duplicate step definition: "${pattern}". Last registration will be used.`
      );
    }
    globalSteps[existingIndex] = {
      pattern,
      regex: compiled.regex,
      paramNames: compiled.paramNames,
      handler,
    };
  } else {
    // No duplicate - add new step
    globalSteps.push({
      pattern,
      regex: compiled.regex,
      paramNames: compiled.paramNames,
      handler,
    });
  }
}

/**
 * Find a matching step definition for a given step text
 * @param stepText - The step text to match
 * @returns Matched step definition and extracted parameters, or null
 */
export function findMatchingStep(stepText: string): {
  definition: StepDefinition;
  params: Record<string, any>;
} | null {
  for (const stepDef of globalSteps) {
    const match = stepText.match(stepDef.regex);
    if (match) {
      const params: Record<string, any> = {};
      stepDef.paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      return { definition: stepDef, params };
    }
  }
  return null;
}

/**
 * Clear all registered steps (useful for testing)
 */
export function clearSteps(): void {
  globalSteps.length = 0;
}

/**
 * Get all registered steps (useful for debugging)
 */
export function getAllSteps(): StepDefinition[] {
  return [...globalSteps];
}

/**
 * Alias for registerStep - provides a cleaner API
 * Usage: step('pattern', handler)
 */
export const step = registerStep;

/**
 * Register a Given step (semantic alias for step)
 * @param pattern - Step pattern with placeholders like {variable}
 * @param handler - Function to execute when step matches
 */
export const Given = registerStep;

/**
 * Register a When step (semantic alias for step)
 * @param pattern - Step pattern with placeholders like {variable}
 * @param handler - Function to execute when step matches
 */
export const When = registerStep;

/**
 * Register a Then step (semantic alias for step)
 * @param pattern - Step pattern with placeholders like {variable}
 * @param handler - Function to execute when step matches
 */
export const Then = registerStep;
