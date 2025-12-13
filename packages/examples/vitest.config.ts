import { defineConfig } from "vitest/config";
import { vitestStoryPlugin } from "@vitest-story/plugin";

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
    // Your other Vitest configuration
  },
});
