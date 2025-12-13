import * as vscode from "vscode";

interface StepDefinitionLocation {
  pattern: string;
  location: vscode.Location;
  regex: RegExp;
}

/**
 * Provides "Go to Definition" functionality for steps in story template literals
 */
export class StepDefinitionProvider implements vscode.DefinitionProvider {
  private stepDefinitions: StepDefinitionLocation[] = [];
  private watcher: vscode.FileSystemWatcher;

  constructor() {
    // Watch for changes in TypeScript/JavaScript files that might contain step definitions
    this.watcher = vscode.workspace.createFileSystemWatcher("**/*.{ts,js}");
    this.watcher.onDidChange((uri) => this.updateStepDefinitionsInFile(uri));
    this.watcher.onDidCreate((uri) => this.updateStepDefinitionsInFile(uri));
    this.watcher.onDidDelete((uri) => this.removeStepDefinitionsInFile(uri));

    // Initial scan
    this.scanWorkspace();
  }

  dispose() {
    this.watcher.dispose();
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    // Check if we're inside a story template literal
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Find if we're inside a story`` block
    const storyRegex = /story\s*`([\s\S]*?)`/g;
    let match;
    let insideStory = false;

    while ((match = storyRegex.exec(text)) !== null) {
      const storyStart = match.index;
      const storyEnd = match.index + match[0].length;
      if (offset >= storyStart && offset <= storyEnd) {
        insideStory = true;
        break;
      }
    }

    if (!insideStory) {
      return undefined;
    }

    // Get the line at the cursor position
    const line = document.lineAt(position.line);
    const lineText = line.text.trim();

    // Check if this line is a step (Given, When, Then, And, But)
    const stepMatch = lineText.match(/^(Given|When|Then|And|But)\s+(.+)$/);
    if (!stepMatch) {
      return undefined;
    }

    const stepText = stepMatch[2].trim();

    // Find matching step definition
    const matchingDefinitions = this.findMatchingStepDefinitions(stepText);
    if (matchingDefinitions.length > 0) {
      // Return all matching definitions
      return matchingDefinitions.map((def) => def.location);
    }

    return undefined;
  }

  private async scanWorkspace() {
    this.stepDefinitions = [];
    const files = await vscode.workspace.findFiles(
      "**/*.{ts,js}",
      "**/node_modules/**"
    );
    for (const file of files) {
      await this.updateStepDefinitionsInFile(file);
    }
  }

  private async updateStepDefinitionsInFile(uri: vscode.Uri) {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();

      // Remove old definitions from this file
      this.stepDefinitions = this.stepDefinitions.filter(
        (def) => def.location.uri.toString() !== uri.toString()
      );

      // Parse step definitions: Given("pattern", ...), When("pattern", ...), Then("pattern", ...)
      const stepDefRegex =
        /(Given|When|Then)\s*\(\s*[`'"]([^`'"]+)[`'"][\s\S]*?\)/g;
      let match;

      while ((match = stepDefRegex.exec(text)) !== null) {
        const pattern = match[2];
        const matchStart = match.index;

        const position = this.getPositionAt(text, matchStart);
        const location = new vscode.Location(uri, position);

        // Convert step pattern to regex for matching
        const regex = this.patternToRegex(pattern);

        this.stepDefinitions.push({
          pattern: pattern,
          location: location,
          regex: regex,
        });
      }
    } catch (error) {
      console.error(
        `Failed to parse step definitions in ${uri.fsPath}:`,
        error
      );
    }
  }

  private removeStepDefinitionsInFile(uri: vscode.Uri) {
    this.stepDefinitions = this.stepDefinitions.filter(
      (def) => def.location.uri.toString() !== uri.toString()
    );
  }

  private findMatchingStepDefinitions(
    stepText: string
  ): StepDefinitionLocation[] {
    const matches: StepDefinitionLocation[] = [];
    for (const def of this.stepDefinitions) {
      if (def.regex.test(stepText)) {
        matches.push(def);
      }
    }
    return matches;
  }

  /**
   * Convert a step pattern like "I have {int} items" to a regex
   * This mirrors the pattern-compiler logic from the plugin
   */
  private patternToRegex(pattern: string): RegExp {
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
        regexPattern += this.escapeRegex(
          pattern.substring(lastIndex, startIndex)
        );
      }

      // Add the capture group for this placeholder
      if (paramName === "yaml") {
        // YAML blocks can be multiline and non-greedy
        regexPattern += "([\\s\\S]+?)";
      } else {
        // Regular parameters: match any characters except newlines
        regexPattern += "(.+?)";
      }

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining literal text
    if (lastIndex < pattern.length) {
      regexPattern += this.escapeRegex(pattern.substring(lastIndex));
    }

    // Create the regex - use 'm' flag for multiline matching
    return new RegExp("^" + regexPattern + "$", "m");
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private getPositionAt(text: string, offset: number): vscode.Position {
    const lines = text.slice(0, offset).split("\n");
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return new vscode.Position(line, character);
  }
}
