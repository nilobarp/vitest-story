/**
 * Vitest plugin for Story DSL
 * Provides automatic step loading, deduplication, and missing step handling
 */

import { Plugin } from "vitest/config";
import * as fs from "fs";
import * as path from "path";
import { configureVitestStory } from "./config.js";

/**
 * Configuration options for the Story plugin
 */
export interface VitestStoryPluginOptions {
  /**
   * Paths to directories containing step definition files
   * @default ['./steps']
   */
  stepsPaths?: string[];

  /**
   * Whether to warn about duplicate step definitions
   * @default true
   */
  warnOnDuplicates?: boolean;

  /**
   * Whether to provide default implementations for missing steps
   * @default true
   */
  provideDefaultImplementations?: boolean;
}

/**
 * Recursively find all step definition files in a directory
 */
function findStepFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...findStepFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(
      `[Scripture] Failed to read directory ${dir}:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  return files;
}

/**
 * Create a Vitest plugin for Story
 * @param options - Plugin configuration options
 * @returns Vitest plugin
 */
export function vitestStoryPlugin(
  options: VitestStoryPluginOptions = {}
): Plugin {
  const {
    stepsPaths = ["./steps"],
    warnOnDuplicates = true,
    provideDefaultImplementations = true,
  } = options;

  // Configure Story with the provided options
  configureVitestStory({
    warnOnDuplicates,
    provideDefaultImplementations,
  });

  return {
    name: "vitest-story",

    // Transform test files that use Story to inject step imports
    transform(code, id) {
      // Only transform test files that import from @vitest-story/plugin
      if (!id.endsWith(".test.ts") && !id.endsWith(".spec.ts")) {
        return null;
      }

      if (!code.includes("@vitest-story/plugin")) {
        return null;
      }

      // Generate imports for all step files
      const imports: string[] = [];

      for (const stepsPath of stepsPaths) {
        const absolutePath = path.resolve(process.cwd(), stepsPath);

        if (!fs.existsSync(absolutePath)) {
          console.warn(
            `[Vitest Story] Steps path does not exist: ${stepsPath}`
          );
          continue;
        }

        const stepFiles = findStepFiles(absolutePath);

        for (const file of stepFiles) {
          // Convert to relative path for import, ensuring forward slashes for consistency
          const relativePath = path
            .relative(path.dirname(id), file)
            .replace(/\\/g, "/");
          const importPath = relativePath.startsWith(".")
            ? relativePath
            : `./${relativePath}`;
          imports.push(`import '${importPath}';`);
        }
      }

      if (imports.length === 0) {
        console.warn(
          `[Vitest Story] No step files found in configured paths: ${stepsPaths.join(", ")}`
        );
      }

      // Prepend the imports to the code
      const injectedCode = imports.join("\n") + "\n\n" + code;
      return {
        code: injectedCode,
        map: null, // No source map for simplicity
      };
    },
  };
}

/**
 * Default export for convenience
 */
export default vitestStoryPlugin;
