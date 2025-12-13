import { defineConfig } from "vitest/config";
import { StoryReporter } from "./packages/plugin/dist/index.js";

export default defineConfig({
  test: {
    reporters: [new StoryReporter()],
  },
});
