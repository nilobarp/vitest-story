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
 * Cached parsed environment tags to avoid re-parsing on each call
 */
let cachedEnvTags: string[] | null = null;
let lastEnvTagsValue: string | undefined = undefined;

/**
 * Configure Vitest Story plugin
 * @param newConfig - Configuration options
 */
export function configureVitestStory(newConfig: VitestStoryConfig): void {
  config = {
    ...config,
    ...newConfig,
  };
  // Clear cache when configuration changes
  cachedEnvTags = null;
}

/**
 * Parse and validate tags from environment variable
 */
function parseEnvTags(envTags: string): string[] {
  // Parse tags from environment variable
  const tags = envTags
    .split(',')
    .map(t => t.trim())
    .filter(t => t);
  
  // Validate that tags are valid identifiers
  const invalidTags = tags.filter(tag => !/^[a-zA-Z0-9_-]+$/.test(tag));
  if (invalidTags.length > 0) {
    console.warn(
      `[Vitest Story] Invalid tag names in VITEST_STORY_TAGS: ${invalidTags.join(', ')}. ` +
      `Tags should contain only letters, numbers, underscores, and hyphens.`
    );
  }
  
  return tags.filter(tag => /^[a-zA-Z0-9_-]+$/.test(tag));
}

/**
 * Get current configuration
 */
export function getVitestStoryConfig(): Required<VitestStoryConfig> {
  // Check environment variable for tags
  const envTags = process.env.VITEST_STORY_TAGS;
  if (envTags) {
    // Use cached result if environment variable hasn't changed
    if (cachedEnvTags === null || lastEnvTagsValue !== envTags) {
      cachedEnvTags = parseEnvTags(envTags);
      lastEnvTagsValue = envTags;
    }
    
    return {
      ...config,
      tags: cachedEnvTags,
    };
  }
  return config;
}
