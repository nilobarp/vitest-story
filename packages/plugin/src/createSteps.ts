/**
 * Factory for creating typed step helpers per-file.
 *
 * Supports lightweight compile-time parsing of pattern tokens like
 * "I add {amount}" producing `params.amount` as a `string`.
 */
import { step as registerStep, Given as regGiven, When as regWhen, Then as regThen, And as regAnd, But as regBut } from "./step-registry.js";

type HintToType<H extends string> = string;

type ExtractTokenNames<S extends string> = S extends `${infer _Start}{${infer Token}}${infer Rest}`
  ? Token | ExtractTokenNames<Rest>
  : never;

type TokenToEntry<T extends string> = T extends `${infer Name}:${infer Hint}`
  ? { [K in Name]: HintToType<Hint & string> }
  : { [K in T]: string };

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

type ParseParams<S extends string> = [ExtractTokenNames<S>] extends [never]
  ? { yaml?: unknown }
  : UnionToIntersection<TokenToEntry<ExtractTokenNames<S>>> & { yaml?: unknown };

// Strict two-arg function type (params always present)
export type StepFn<Ctx, Pattern extends string> = (
  ctx: Ctx,
  params: ParseParams<Pattern>
) => void | Promise<void>;

// Allow handlers that accept only `ctx` for ergonomics
type HandlerUnion<Ctx, P extends string> =
  | ((ctx: Ctx) => void | Promise<void>)
  | ((ctx: Ctx, params: ParseParams<P>) => void | Promise<void>);

export function createSteps<Ctx = Record<string, any>>() {
  const makeRegistrar = (regFn: (pattern: string, handler: any) => void) => {
    type Registrar = {
      <P extends string>(pattern: P, handler: (ctx: Ctx, params: ParseParams<P>) => void | Promise<void>): void;
      <P extends string>(pattern: P, handler: (ctx: Ctx) => void | Promise<void>): void;
    };

    const registrar = ((pattern: string, handler: any) => {
      const wrapped = (ctx: Ctx, params: Record<string, any>) => {
        const p = params ?? {};
        if (handler.length >= 2) {
          return handler(ctx, p as ParseParams<typeof pattern>);
        }
        return handler(ctx);
      };
      regFn(pattern, wrapped as any);
    }) as Registrar;

    return registrar;
  };

  return {
    step: makeRegistrar(registerStep),
    Given: makeRegistrar(regGiven),
    When: makeRegistrar(regWhen),
    Then: makeRegistrar(regThen),
    And: makeRegistrar(regAnd),
    But: makeRegistrar(regBut),
  } as const;
}

export type CreateStepsResult<Ctx> = ReturnType<typeof createSteps<Ctx>>;
