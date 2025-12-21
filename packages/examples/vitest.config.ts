import { defineConfig } from "vitest/config";
import { vitestStoryPlugin } from "vitest-story";

export default defineConfig({
  plugins: [
    vitestStoryPlugin({
      // Paths to directories containing step definition files
      // Default: ['./steps']
      stepsPaths: ["./steps"],
      // Paths to directories containing .story files
      // Default: ['./stories']
      storyPaths: ["./stories"],
      // Warn about duplicate step definitions (last one wins)
      // Default: true
      warnOnDuplicates: true,
      // Provide default implementations for missing steps
      // Default: true
      provideDefaultImplementations: true,
    }),
  ],
  test: {
    // Include .story files in test patterns
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}", "**/*.story"],
  },
});
