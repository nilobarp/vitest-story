/**
 * Core type definitions for DSL
 */

/**
 * Context object that carries state across steps
 */
export type Context = Record<string, any>;

/**
 * Step function that executes the step logic
 */
export type StepFunction = (
  ctx: Context,
  params: Record<string, any>
) => void | Promise<void>;

export interface StepDefinition {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: StepFunction;
}

export type TokenType = "scenario" | "step" | "yaml";

export interface Token {
  type: TokenType;
  keyword?: string; // Given, When, Then, And
  text: string;
  yaml?: string;
  lineNumber: number;
}

export interface ParsedScenario {
  title: string;
  tokens: Token[];
}

export type StepRegistryCallback = (api: {
  step: (pattern: string, handler: StepFunction) => void;
  ctx: Context;
}) => void;

/**
 * Hook function type for before/after hooks
 */
export type HookFunction = (ctx: Context) => void | Promise<void>;

/**
 * Hook definition
 */
export interface HookDefinition {
  type: "beforeFeature" | "afterFeature" | "beforeScenario" | "afterScenario";
  handler: HookFunction;
}

/**
 * Step execution information for reporter
 */
export interface StepExecution {
  keyword: string;
  text: string;
  state: "passed" | "failed";
  duration: number;
  error?: Error;
}

/**
 * Extended task metadata with story steps
 */
export interface StoryTaskMeta {
  storySteps?: StepExecution[];
}
