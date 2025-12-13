/**
 * Pattern compiler that transforms step patterns with placeholders into regex
 */

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a step pattern into a regex and extract parameter names
 * @param pattern - Pattern with placeholders like {variable}, {yaml}
 * @returns Compiled regex and parameter names
 */
export function compilePattern(pattern: string): {
  regex: RegExp;
  paramNames: string[];
} {
  const paramNames: string[] = [];
  let regexPattern = "";
  let lastIndex = 0;

  // Find all placeholders in the pattern
  const placeholderRegex = /\{(\w+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(pattern)) !== null) {
    const paramName = match[1];
    const startIndex = match.index;

    // Add the literal text before this placeholder (escaped)
    if (startIndex > lastIndex) {
      regexPattern += escapeRegex(pattern.substring(lastIndex, startIndex));
    }

    // Add the capture group for this placeholder
    if (paramName === "yaml") {
      // YAML blocks can be multiline and non-greedy
      regexPattern += "([\\s\\S]+?)";
    } else {
      // Regular parameters: match any characters except newlines
      // This handles both quoted and unquoted parameters
      regexPattern += "(.+?)";
    }

    paramNames.push(paramName);
    lastIndex = match.index + match[0].length;
  }

  // Add any remaining literal text
  if (lastIndex < pattern.length) {
    regexPattern += escapeRegex(pattern.substring(lastIndex));
  }

  // Create the regex - use 'm' flag for multiline matching
  const regex = new RegExp("^" + regexPattern + "$", "m");

  return { regex, paramNames };
}
