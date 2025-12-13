/**
 * Vitest-specific exports for Story DSL
 * Import from '@vitest-story/lib/vitest' when using with Vitest
 */

import { test } from "vitest";
import { createStory } from "./story.js";

/**
 * Story template literal configured for Vitest
 */
export const story = createStory(test);

/**
 * Step registration and utility functions
 */
export { step, clearSteps, Given, When, Then } from "./step-registry.js";

/**
 * Hook registration and utility functions
 */
export {
  beforeFeature,
  afterFeature,
  beforeScenario,
  afterScenario,
  clearHooks,
} from "./hook-registry.js";

/**
 * Configuration
 */
export { configureVitestStory, getVitestStoryConfig } from "./config.js";
export type { VitestStoryConfig } from "./config.js";

/**
 * Plugin (for vitest.config.ts)
 */
export { storyPlugin } from "./plugin.js";
export type { VitestStoryPluginOptions } from "./plugin.js";
