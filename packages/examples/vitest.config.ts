import { defineConfig } from "vitest/config";
import { vitestStoryPlugin, StoryReporter } from "vitest-story";

export default defineConfig({
  plugins: [
    vitestStoryPlugin({
      // Paths to directories containing step definition files
      // Default: ['./steps']
      stepsPaths: ["./steps/autoload"],
      // Warn about duplicate step definitions (last one wins)
      // Default: true
      warnOnDuplicates: true,
      // Provide default implementations for missing steps
      // Default: true
      provideDefaultImplementations: true,
    }),
  ],
  test: {
    // Use the custom Story reporter
    reporters: [new StoryReporter()],
  },
});
