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
}

/**
 * Global configuration state
 */
let config: Required<VitestStoryConfig> = {
  provideDefaultImplementations: true,
  warnOnDuplicates: true,
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
  return config;
}
