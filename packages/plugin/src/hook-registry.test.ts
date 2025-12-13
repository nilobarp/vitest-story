/**
 * Tests for hook registry functionality
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  beforeFeature,
  afterFeature,
  beforeScenario,
  afterScenario,
  getHooks,
  clearHooks,
} from "./hook-registry";
import { Context } from "./types";

describe("hookRegistry", () => {
  beforeEach(() => {
    clearHooks();
  });

  it("should register beforeFeature hooks", () => {
    const handler = (ctx: Context) => {
      ctx.test = true;
    };

    beforeFeature(handler);

    const hooks = getHooks("beforeFeature");
    expect(hooks).toHaveLength(1);
    expect(hooks[0].type).toBe("beforeFeature");
    expect(hooks[0].handler).toBe(handler);
  });

  it("should register afterFeature hooks", () => {
    const handler = (ctx: Context) => {
      ctx.test = true;
    };

    afterFeature(handler);

    const hooks = getHooks("afterFeature");
    expect(hooks).toHaveLength(1);
    expect(hooks[0].type).toBe("afterFeature");
    expect(hooks[0].handler).toBe(handler);
  });

  it("should register beforeScenario hooks", () => {
    const handler = (ctx: Context) => {
      ctx.test = true;
    };

    beforeScenario(handler);

    const hooks = getHooks("beforeScenario");
    expect(hooks).toHaveLength(1);
    expect(hooks[0].type).toBe("beforeScenario");
    expect(hooks[0].handler).toBe(handler);
  });

  it("should register afterScenario hooks", () => {
    const handler = (ctx: Context) => {
      ctx.test = true;
    };

    afterScenario(handler);

    const hooks = getHooks("afterScenario");
    expect(hooks).toHaveLength(1);
    expect(hooks[0].type).toBe("afterScenario");
    expect(hooks[0].handler).toBe(handler);
  });

  it("should register multiple hooks of the same type", () => {
    const handler1 = (ctx: Context) => {
      ctx.test1 = true;
    };
    const handler2 = (ctx: Context) => {
      ctx.test2 = true;
    };

    beforeFeature(handler1);
    beforeFeature(handler2);

    const hooks = getHooks("beforeFeature");
    expect(hooks).toHaveLength(2);
  });

  it("should filter hooks by type", () => {
    beforeFeature((ctx) => {
      ctx.before = true;
    });
    afterFeature((ctx) => {
      ctx.after = true;
    });

    const beforeHooks = getHooks("beforeFeature");
    const afterHooks = getHooks("afterFeature");

    expect(beforeHooks).toHaveLength(1);
    expect(afterHooks).toHaveLength(1);
    expect(beforeHooks[0].type).toBe("beforeFeature");
    expect(afterHooks[0].type).toBe("afterFeature");
  });

  it("should clear all hooks", () => {
    beforeFeature((ctx) => {
      ctx.test = true;
    });
    afterFeature((ctx) => {
      ctx.test = true;
    });
    beforeScenario((ctx) => {
      ctx.test = true;
    });
    afterScenario((ctx) => {
      ctx.test = true;
    });

    expect(getHooks("beforeFeature")).toHaveLength(1);
    expect(getHooks("afterFeature")).toHaveLength(1);
    expect(getHooks("beforeScenario")).toHaveLength(1);
    expect(getHooks("afterScenario")).toHaveLength(1);

    clearHooks();

    expect(getHooks("beforeFeature")).toHaveLength(0);
    expect(getHooks("afterFeature")).toHaveLength(0);
    expect(getHooks("beforeScenario")).toHaveLength(0);
    expect(getHooks("afterScenario")).toHaveLength(0);
  });
});
