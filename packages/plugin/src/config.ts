export interface VitestStoryConfig {
  /**
   * Whether to provide default implementations for missing steps
   * Default implementations will throw an error indicating the step is not implemented
   * @default true
   */
  provideDefaultImplementations?: boolean;

  /**
   * Whether to warn about duplicate step definitions
   * @default true
   */
  warnOnDuplicates?: boolean;

  /**
   * Tags to filter scenarios by
   * Only scenarios with at least one of these tags will be executed
   * Can be set via VITEST_STORY_TAGS environment variable (comma-separated)
   */
  tags?: string[];
}

/**
 * Global configuration state
 */
let config: Required<VitestStoryConfig> = {
  provideDefaultImplementations: true,
  warnOnDuplicates: true,
  tags: [],
};

/**
 * Configure Vitest Story plugin
 * @param newConfig - Configuration options
 */
export function configureVitestStory(newConfig: VitestStoryConfig): void {
  config = {
    ...config,
    ...newConfig,
  };
}

/**
 * Get current configuration
 */
export function getVitestStoryConfig(): Required<VitestStoryConfig> {
  // Check environment variable for tags
  const envTags = process.env.VITEST_STORY_TAGS;
  if (envTags) {
    return {
      ...config,
      tags: envTags.split(',').map(t => t.trim()).filter(t => t),
    };
  }
  return config;
}
