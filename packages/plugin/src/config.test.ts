import { describe, test, expect, beforeEach } from "vitest";
import { configureVitestStory, getVitestStoryConfig } from "../src/config";

describe("Vitest Story Configuration", () => {
  beforeEach(() => {
    // Reset to defaults
    configureVitestStory({
      provideDefaultImplementations: true,
      warnOnDuplicates: true,
    });
  });

  test("should have default configuration", () => {
    const config = getVitestStoryConfig();
    expect(config.provideDefaultImplementations).toBe(true);
    expect(config.warnOnDuplicates).toBe(true);
  });

  test("should allow configuring provideDefaultImplementations", () => {
    configureVitestStory({
      provideDefaultImplementations: true,
    });

    const config = getVitestStoryConfig();
    expect(config.provideDefaultImplementations).toBe(true);
  });

  test("should allow configuring warnOnDuplicates", () => {
    configureVitestStory({
      warnOnDuplicates: false,
    });

    const config = getVitestStoryConfig();
    expect(config.warnOnDuplicates).toBe(false);
  });

  test("should merge with existing config", () => {
    configureVitestStory({
      provideDefaultImplementations: true,
    });

    configureVitestStory({
      warnOnDuplicates: false,
    });

    const config = getVitestStoryConfig();
    expect(config.provideDefaultImplementations).toBe(true);
    expect(config.warnOnDuplicates).toBe(false);
  });
});
