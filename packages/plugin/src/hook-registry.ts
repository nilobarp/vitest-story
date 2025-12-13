/**
 * Global hook registry for storing before/after hooks
 */

import { HookDefinition, HookFunction } from "./types";

/**
 * Global registry of hook definitions
 */
const globalHooks: HookDefinition[] = [];

/**
 * Register a beforeFeature hook
 * @param handler - Function to execute before each feature/story
 */
export function beforeFeature(handler: HookFunction): void {
  globalHooks.push({
    type: "beforeFeature",
    handler,
  });
}

/**
 * Register an afterFeature hook
 * @param handler - Function to execute after each feature/story
 */
export function afterFeature(handler: HookFunction): void {
  globalHooks.push({
    type: "afterFeature",
    handler,
  });
}

/**
 * Register a beforeScenario hook
 * @param handler - Function to execute before each scenario
 */
export function beforeScenario(handler: HookFunction): void {
  globalHooks.push({
    type: "beforeScenario",
    handler,
  });
}

/**
 * Register an afterScenario hook
 * @param handler - Function to execute after each scenario
 */
export function afterScenario(handler: HookFunction): void {
  globalHooks.push({
    type: "afterScenario",
    handler,
  });
}

/**
 * Get all hooks of a specific type
 * @param type - The hook type to retrieve
 * @returns Array of hook definitions
 */
export function getHooks(type: HookDefinition["type"]): HookDefinition[] {
  return globalHooks.filter((hook) => hook.type === type);
}

/**
 * Clear all registered hooks (useful for testing)
 */
export function clearHooks(): void {
  globalHooks.length = 0;
}
