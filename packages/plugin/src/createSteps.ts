/**
 * Factory for creating typed step helpers per-file.
 *
 * Usage: const { Given, When, Then } = createSteps<MyContext>();
 */
import { step as registerStep, Given as regGiven, When as regWhen, Then as regThen, And as regAnd, But as regBut } from "./step-registry.js";

export type StepParams = Record<string, any>;

export type StepHandler<Ctx> = (ctx: Ctx, params?: StepParams) => void | Promise<void>;

export function createSteps<Ctx = Record<string, any>>() {
  const wrap = (fn: (pattern: string, handler: any) => void) => {
    return (pattern: string, handler: StepHandler<Ctx>) => fn(pattern, handler as any);
  };

  return {
    step: wrap(registerStep),
    Given: wrap(regGiven),
    When: wrap(regWhen),
    Then: wrap(regThen),
    And: wrap(regAnd),
    But: wrap(regBut),
  } as const;
}

export type CreateStepsResult<Ctx> = ReturnType<typeof createSteps<Ctx>>;
