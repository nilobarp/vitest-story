import { Token, ParsedScenario, ParsedFeature } from "./types.js";

const STEP_KEYWORDS = ["Given", "When", "Then", "And", "But"];

/**
 * Parse tags from a line (tags are @word tokens before the main content)
 * @param line - The line to parse
 * @returns Array of tags found
 */
function parseTags(line: string): string[] {
  const tags: string[] = [];
  const tagRegex = /@(\w+)/g;
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    tags.push(match[1]);
  }
  return tags;
}

/**
 * Parse feature text into structured format with scenarios and background
 * @param text - The feature text from template literal
 * @returns Parsed feature with scenarios and background
 */
export function tokenizeFeature(text: string): ParsedFeature {
  const lines = text.split("\n");
  let featureTitle: string | null = null;
  let featureTags: string[] = [];
  const backgroundTokens: Token[] = [];
  const scenarios: ParsedScenario[] = [];
  let currentScenario: ParsedScenario | null = null;
  let currentTokens: Token[] = [];
  let currentStepToken: Token | null = null;
  let inBackground = false;
  let pendingTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Check for tag lines (lines starting with @)
    if (trimmed.startsWith("@")) {
      const tags = parseTags(trimmed);
      pendingTags.push(...tags);
      continue;
    }

    // Parse feature title
    if (trimmed.startsWith("Feature:")) {
      featureTitle = trimmed.substring("Feature:".length).trim();
      // Assign pending tags to feature
      if (pendingTags.length > 0) {
        featureTags = [...pendingTags];
        pendingTags = [];
      }
      continue;
    }

    // Parse background section
    if (trimmed.startsWith("Background:")) {
      inBackground = true;
      currentScenario = null;
      currentTokens = backgroundTokens;
      // Clear pending tags as they don't apply to background
      pendingTags = [];
      continue;
    }

    // Parse scenario title
    if (trimmed.startsWith("Scenario:")) {
      // If we were in a scenario, save it
      if (currentScenario) {
        scenarios.push(currentScenario);
      }

      const scenarioTitle = trimmed.substring("Scenario:".length).trim();
      currentScenario = {
        title: scenarioTitle,
        tokens: [],
        tags: [...pendingTags], // Assign pending tags to scenario
      };
      pendingTags = []; // Clear pending tags
      currentTokens = currentScenario.tokens;
      inBackground = false;
      continue;
    }

    // Check for triple-quote YAML block
    if (trimmed.startsWith('"""yaml') || trimmed.startsWith("'''yaml")) {
      const yamlLines: string[] = [];
      i++; // Move to next line

      // Collect YAML content until closing quotes
      while (i < lines.length) {
        const yamlLine = lines[i];
        const yamlTrimmed = yamlLine.trim();

        if (yamlTrimmed === '"""' || yamlTrimmed === "'''") {
          break;
        }

        yamlLines.push(lines[i]);
        i++;
      }

      // Attach YAML to the previous step token
      if (currentStepToken) {
        currentStepToken.yaml = yamlLines.join("\n");
      }

      continue;
    }

    // Check for step keywords
    const stepMatch = STEP_KEYWORDS.find((keyword) =>
      trimmed.startsWith(keyword + " ")
    );
    if (stepMatch) {
      const stepText = trimmed.substring(stepMatch.length + 1).trim();

      // Check if step text ends with a colon (indicating YAML block follows)
      const hasYamlIndicator = stepText.endsWith(":");
      const cleanStepText = hasYamlIndicator
        ? stepText.slice(0, -1).trim()
        : stepText;

      currentStepToken = {
        type: "step",
        keyword: stepMatch,
        text: cleanStepText,
        lineNumber: i + 1,
      };

      currentTokens.push(currentStepToken);

      // If there's a colon, check for indented YAML block on next lines
      if (hasYamlIndicator) {
        let j = i + 1;

        // Check if next line is a triple-quote YAML marker
        if (j < lines.length) {
          const nextTrimmed = lines[j].trim();
          if (
            nextTrimmed.startsWith('"""yaml') ||
            nextTrimmed.startsWith("'''yaml")
          ) {
            // Handle triple-quote YAML - skip the marker line and collect until closing quotes
            const quoteType = nextTrimmed.startsWith('"""') ? '"""' : "'''";
            const yamlLines: string[] = [];
            j++; // Skip the opening marker

            while (j < lines.length) {
              const yamlLine = lines[j];
              const yamlTrimmed = yamlLine.trim();

              if (yamlTrimmed === quoteType) {
                j++; // Skip closing marker
                break;
              }

              yamlLines.push(yamlLine);
              j++;
            }

            if (yamlLines.length > 0) {
              // Remove common indentation
              const nonEmptyLines = yamlLines.filter((l) => l.trim());
              const minIndent =
                nonEmptyLines.length > 0
                  ? Math.min(
                      ...nonEmptyLines.map(
                        (l) => l.match(/^\s*/)?.[0].length || 0
                      )
                    )
                  : 0;

              currentStepToken.yaml = yamlLines
                .map((l) => l.substring(minIndent))
                .join("\n");
            }

            i = j - 1; // Move index forward
          } else {
            // Regular indented YAML
            const yamlLines: string[] = [];

            while (j < lines.length) {
              const nextLine = lines[j];
              const nextTrimmed = nextLine.trim();

              // Stop if we hit an empty line or a new step
              if (
                !nextTrimmed ||
                STEP_KEYWORDS.some((kw) => nextTrimmed.startsWith(kw + " "))
              ) {
                break;
              }

              // If line is indented, it's part of the YAML block
              if (nextLine.match(/^\s+/)) {
                yamlLines.push(nextLine);
                j++;
              } else {
                break;
              }
            }

            if (yamlLines.length > 0) {
              // Remove common indentation
              const nonEmptyLines = yamlLines.filter((l) => l.trim());
              const minIndent =
                nonEmptyLines.length > 0
                  ? Math.min(
                      ...nonEmptyLines.map(
                        (l) => l.match(/^\s*/)?.[0].length || 0
                      )
                    )
                  : 0;

              currentStepToken.yaml = yamlLines
                .map((l) => l.substring(minIndent))
                .join("\n");

              i = j - 1; // Move index forward
            }
          }
        }
      }

      continue;
    }
  }

  // Save the last scenario if there is one
  if (currentScenario) {
    scenarios.push(currentScenario);
  }

  return { featureTitle, featureTags, backgroundTokens, scenarios };
}

/**
 * Parse scenario text into structured tokens (backward compatibility)
 * @param text - The scenario text from template literal
 * @returns Parsed scenario with title and tokens
 */
export function tokenize(text: string): ParsedScenario {
  // Use tokenizeFeature to parse the text
  const feature = tokenizeFeature(text);
  
  // If there are multiple scenarios, return the first one
  // This maintains backward compatibility with single-scenario usage
  if (feature.scenarios.length > 0) {
    return feature.scenarios[0];
  }
  
  // If no scenarios found, return empty scenario
  return { title: "", tokens: [], tags: [] };
}
