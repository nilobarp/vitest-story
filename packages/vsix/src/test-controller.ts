import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";

export class VitestStoryTestController implements vscode.Disposable {
  private controller: vscode.TestController;
  private watchers: vscode.FileSystemWatcher[] = [];
  private packageManagerCache: Map<string, string> = new Map();
  private outputChannel: vscode.OutputChannel;

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
    this.controller = vscode.tests.createTestController(
      "vitest-story",
      "Vitest Story"
    );
    this.controller.resolveHandler = (item) => this.resolveTests(item);

    this.controller.createRunProfile(
      "Run",
      vscode.TestRunProfileKind.Run,
      (request, token) => this.runTests(request, token, false)
    );

    this.controller.createRunProfile(
      "Debug",
      vscode.TestRunProfileKind.Debug,
      (request, token) => this.runTests(request, token, true)
    );

    // Watch for .test.ts and .spec.ts files
    const testWatcher = vscode.workspace.createFileSystemWatcher(
      "**/*.{test,spec}.{ts,js}"
    );
    testWatcher.onDidChange((uri) => this.updateTestsInFile(uri));
    testWatcher.onDidCreate((uri) => this.updateTestsInFile(uri));
    testWatcher.onDidDelete((uri) => this.removeTestsInFile(uri));
    this.watchers.push(testWatcher);

    // Watch for .story files
    const storyWatcher = vscode.workspace.createFileSystemWatcher(
      "**/*.story"
    );
    storyWatcher.onDidChange((uri) => this.updateTestsInFile(uri));
    storyWatcher.onDidCreate((uri) => this.updateTestsInFile(uri));
    storyWatcher.onDidDelete((uri) => this.removeTestsInFile(uri));
    this.watchers.push(storyWatcher);

    // Initial scan
    this.scanWorkspace();
  }

  dispose() {
    this.controller.dispose();
    this.watchers.forEach((watcher) => watcher.dispose());
  }

  private async detectPackageManager(cwd: string): Promise<string> {
    // Check cache first
    if (this.packageManagerCache.has(cwd)) {
      return this.packageManagerCache.get(cwd)!;
    }

    try {
      // Check current directory and parent directories for lock files
      let currentDir = cwd;
      const root = path.parse(currentDir).root;
      
      while (currentDir !== root) {
        // First, check if packageManager is defined in package.json
        const packageJsonPath = path.join(currentDir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, "utf8")
            );
            if (
              packageJson.packageManager &&
              typeof packageJson.packageManager === "string"
            ) {
              // packageManager field format is like "pnpm@8.0.0" or "npm@9.0.0"
              // For scoped packages like "@scope/name@version", extract the name part
              let packageManager = packageJson.packageManager.trim();
            
            // Handle empty or invalid values
            if (!packageManager) {
              // Continue to lock file detection
              throw new Error("Empty packageManager field");
            }
            
            // Remove version (everything after last @)
            const lastAtIndex = packageManager.lastIndexOf("@");
            if (lastAtIndex > 0) {
              packageManager = packageManager.substring(0, lastAtIndex);
            }
            
            // Remove scope if present (everything before and including first @/)
            if (packageManager.startsWith("@")) {
              const scopeEnd = packageManager.indexOf("/");
              if (scopeEnd > 0) {
                packageManager = packageManager.substring(scopeEnd + 1);
              } else {
                // Invalid scoped package without name (e.g., just "@scope")
                // Continue to lock file detection
                throw new Error("Invalid scoped package format");
              }
            }
            
            // Final validation - package manager name should not be empty
            if (!packageManager) {
              throw new Error("Could not extract package manager name");
            }
            
            this.packageManagerCache.set(cwd, packageManager);
            return packageManager;
          }
        } catch (e) {
          console.error(
            `Failed to parse package.json at ${packageJsonPath}:`,
            e
          );
          // Continue to lock file detection
        }
        }

        // Fall back to detecting lock files in current directory
        if (fs.existsSync(path.join(currentDir, "pnpm-lock.yaml"))) {
          this.packageManagerCache.set(cwd, "pnpm");
          return "pnpm";
        }
        if (fs.existsSync(path.join(currentDir, "yarn.lock"))) {
          this.packageManagerCache.set(cwd, "yarn");
          return "yarn";
        }
        if (fs.existsSync(path.join(currentDir, "package-lock.json"))) {
          this.packageManagerCache.set(cwd, "npm");
          return "npm";
        }
        if (fs.existsSync(path.join(currentDir, "bun.lockb"))) {
          this.packageManagerCache.set(cwd, "bun");
          return "bun";
        }
        
        // Move to parent directory
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break; // Reached filesystem root
        currentDir = parentDir;
      }

      // Default to npm if nothing found
      this.packageManagerCache.set(cwd, "npm");
      return "npm";
    } catch (e) {
      console.error("Failed to detect package manager:", e);
      return "npm";
    }
  }

  private async scanWorkspace() {
    // Find .test.ts and .spec.ts files
    const testFiles = await vscode.workspace.findFiles(
      "**/*.{test,spec}.{ts,js}",
      "**/node_modules/**"
    );
    
    // Find .story files
    const storyFiles = await vscode.workspace.findFiles(
      "**/*.story",
      "**/node_modules/**"
    );
    
    // Combine and process all files
    const allFiles = [...testFiles, ...storyFiles];
    for (const file of allFiles) {
      await this.updateTestsInFile(file);
    }
  }

  private async resolveTests(item: vscode.TestItem | undefined) {
    if (!item) {
      await this.scanWorkspace();
    }
  }

  private async updateTestsInFile(uri: vscode.Uri) {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const text = document.getText();
      this.parseTests(text, uri);
    } catch (e) {
      console.error(`Failed to parse tests in ${uri.fsPath}:`, e);
    }
  }

  private removeTestsInFile(uri: vscode.Uri) {
    this.controller.items.delete(uri.toString());
  }

  private parseTests(text: string, uri: vscode.Uri) {
    const fileId = uri.toString();
    const fileItem = this.controller.createTestItem(
      fileId,
      path.basename(uri.fsPath),
      uri
    );

    const children: vscode.TestItem[] = [];

    // Check if this is a .story file
    if (uri.fsPath.endsWith('.story')) {
      // Parse .story file format (plain Gherkin)
      this.parseStoryFile(text, uri, fileItem, children);
    } else {
      // Parse template literal format in .test.ts files
      this.parseTemplateLiteralFormat(text, uri, fileItem, children);
    }

    if (children.length > 0) {
      fileItem.children.replace(children);
      this.controller.items.add(fileItem);
    } else {
      this.controller.items.delete(fileId);
    }
  }

  private parseStoryFile(
    text: string,
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    children: vscode.TestItem[]
  ) {
    const fileId = uri.toString();
    const lines = text.split('\n');
    
    let currentFeature: {
      title: string | null;
      startLine: number;
      scenarios: Array<{
        title: string;
        startLine: number;
        steps: Array<{ keyword: string; text: string; line: number }>;
      }>;
    } | null = null;

    let currentScenario: {
      title: string;
      startLine: number;
      steps: Array<{ keyword: string; text: string; line: number }>;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match Feature
      const featureMatch = line.match(/^Feature:\s*(.+)$/);
      if (featureMatch) {
        // Flush previous scenario into current feature or children
        if (currentScenario) {
          if (!currentFeature) {
            // No feature yet - add scenario directly to children
            this.addScenarioItem(uri, fileId, currentScenario, children);
          } else {
            currentFeature.scenarios.push(currentScenario);
          }
          currentScenario = null;
        }

        // Flush previous feature if exists
        if (currentFeature) {
          this.addFeatureItem(uri, fileId, currentFeature, children);
        }

        // Start new feature
        currentFeature = {
          title: featureMatch[1].trim() || null,
          startLine: i,
          scenarios: []
        };
        continue;
      }

      // Match Scenario or Scenario Outline
      const scenarioMatch = line.match(/^Scenario(?:\s+Outline)?:\s*(.+)$/);
      if (scenarioMatch) {
        // Save previous scenario if exists
        if (currentScenario) {
          if (!currentFeature) {
            this.addScenarioItem(uri, fileId, currentScenario, children);
          } else {
            currentFeature.scenarios.push(currentScenario);
          }
        }
        
        // Start new scenario
        currentScenario = {
          title: scenarioMatch[1].trim(),
          startLine: i,
          steps: []
        };
        continue;
      }

      // Match step lines (Given, When, Then, And, But)
      const stepMatch = line.match(/^(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch && currentScenario) {
        currentScenario.steps.push({
          keyword: stepMatch[1],
          text: stepMatch[2].trim(),
          line: i
        });
      }

      // Ignore Background, comments, and empty lines
    }

    // Flush any remaining current scenario
    if (currentScenario) {
      if (!currentFeature) {
        this.addScenarioItem(uri, fileId, currentScenario, children);
      } else {
        currentFeature.scenarios.push(currentScenario);
      }
    }

    // Flush any remaining feature
    if (currentFeature) {
      this.addFeatureItem(uri, fileId, currentFeature, children);
    }
  }

  private addScenarioItem(
    uri: vscode.Uri,
    fileId: string,
    scenario: {
      title: string;
      startLine: number;
      steps: Array<{ keyword: string; text: string; line: number }>;
    },
    children: vscode.TestItem[]
  ) {
    const testId = `${fileId}::${scenario.title}`;
    const position = new vscode.Position(scenario.startLine, 0);
    const scenarioItem = this.controller.createTestItem(testId, scenario.title, uri);
    scenarioItem.range = new vscode.Range(position, position);

    // Add steps as children
    const stepChildren: vscode.TestItem[] = [];
    for (const step of scenario.steps) {
      const stepId = `${testId}::${step.keyword} ${step.text}`;
      const stepPosition = new vscode.Position(step.line, 0);
      const stepItem = this.controller.createTestItem(
        stepId,
        `${step.keyword} ${step.text}`,
        uri
      );
      stepItem.range = new vscode.Range(stepPosition, stepPosition);
      stepChildren.push(stepItem);
    }

    if (stepChildren.length > 0) {
      scenarioItem.children.replace(stepChildren);
    }

    children.push(scenarioItem);
  }

  private addFeatureItem(
    uri: vscode.Uri,
    fileId: string,
    feature: {
      title: string | null;
      startLine: number;
      scenarios: Array<{
        title: string;
        startLine: number;
        steps: Array<{ keyword: string; text: string; line: number }>;
      }>;
    },
    children: vscode.TestItem[]
  ) {
    const featureTitle = feature.title || "Feature";
    const featureId = `${fileId}::feature:${featureTitle}`;
    const position = new vscode.Position(feature.startLine, 0);
    const featureItem = this.controller.createTestItem(
      featureId,
      featureTitle,
      uri
    );
    featureItem.range = new vscode.Range(position, position);

    const scenarioChildren: vscode.TestItem[] = [];
    for (const scenario of feature.scenarios) {
      this.addScenarioItem(uri, fileId, scenario, scenarioChildren);
    }

    if (scenarioChildren.length > 0) {
      featureItem.children.replace(scenarioChildren);
    }

    children.push(featureItem);
  }

  private parseTemplateLiteralFormat(
    text: string,
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    children: vscode.TestItem[]
  ) {
    const fileId = uri.toString();
    const storyRegex = /story\s*`([\s\S]*?)`/g;
    let match;

    while ((match = storyRegex.exec(text)) !== null) {
      const content = match[1];
      const startOffset = match.index;

      const scenarioRegex = /Scenario:\s*(.+)/g;
      let scenarioMatch;

      // Check for a Feature title inside this story content
      const featureExec = /Feature:\s*(.+)/.exec(content);
      let featureItem: vscode.TestItem | null = null;
      const featureScenarioChildren: vscode.TestItem[] = [];
      let featurePosition: vscode.Position | null = null;

      if (featureExec) {
        const featureTitle = featureExec[1].trim();
        const contentStart = match[0].indexOf(match[1]);
        const featureStartInContent = featureExec.index || 0;
        const featureAbsoluteOffset =
          startOffset + contentStart + featureStartInContent;
        featurePosition = this.getPositionAt(text, featureAbsoluteOffset);

        const featureId = `${fileId}::feature:${featureTitle}`;
        featureItem = this.controller.createTestItem(featureId, featureTitle, uri);
        featureItem.range = new vscode.Range(featurePosition, featurePosition);
      }

      while ((scenarioMatch = scenarioRegex.exec(content)) !== null) {
        const title = scenarioMatch[1].trim();
        const contentStart = match[0].indexOf(match[1]);
        const scenarioStartInContent = scenarioMatch.index;
        const absoluteOffset =
          startOffset + contentStart + scenarioStartInContent;

        const position = this.getPositionAt(text, absoluteOffset);

        const testId = `${fileId}::${title}`;
        const scenarioItem = this.controller.createTestItem(testId, title, uri);
        scenarioItem.range = new vscode.Range(position, position);

        // Parse individual steps within this scenario
        const stepRegex = /(Given|When|Then|And|But)\s+(.+)/g;
        const stepChildren: vscode.TestItem[] = [];
        let stepMatch;

        while ((stepMatch = stepRegex.exec(content)) !== null) {
          const stepKeyword = stepMatch[1];
          const stepText = stepMatch[2].trim();
          const stepStartInContent = stepMatch.index;
          const stepAbsoluteOffset =
            startOffset + contentStart + stepStartInContent;
          const stepPosition = this.getPositionAt(text, stepAbsoluteOffset);

          const stepId = `${testId}::${stepKeyword} ${stepText}`;
          const stepItem = this.controller.createTestItem(
            stepId,
            `${stepKeyword} ${stepText}`,
            uri
          );
          stepItem.range = new vscode.Range(stepPosition, stepPosition);
          stepChildren.push(stepItem);
        }

        if (stepChildren.length > 0) {
          scenarioItem.children.replace(stepChildren);
        }

        if (featureItem) {
          featureScenarioChildren.push(scenarioItem);
        } else {
          children.push(scenarioItem);
        }
      }

      if (featureItem && featureScenarioChildren.length > 0) {
        featureItem.children.replace(featureScenarioChildren);
        children.push(featureItem);
      }
    }
  }

  private getPositionAt(text: string, offset: number): vscode.Position {
    const lines = text.slice(0, offset).split("\n");
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return new vscode.Position(line, character);
  }

  private async runTests(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
    debug: boolean = false
  ) {
    const run = this.controller.createTestRun(request);
    const queue: vscode.TestItem[] = [];

    if (request.include) {
      request.include.forEach((test) => queue.push(test));
    } else {
      this.controller.items.forEach((test) => queue.push(test));
    }

    const testsByFile = new Map<string, vscode.TestItem[]>();

    for (const test of queue) {
      const fileUri = test.uri!;
      const fileKey = fileUri.toString();
      if (!testsByFile.has(fileKey)) {
        testsByFile.set(fileKey, []);
      }
      testsByFile.get(fileKey)!.push(test);
    }

    for (const [fileKey, tests] of testsByFile) {
      if (token.isCancellationRequested) break;

      const uri = vscode.Uri.parse(fileKey);
      const fileItem = this.controller.items.get(fileKey);

      if (fileItem) {
        await this.runFile(uri, fileItem, run, tests, debug);
      }
    }

    run.end();
  }

  private async runFile(
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    run: vscode.TestRun,
    testsToRun: vscode.TestItem[],
    debug: boolean = false
  ) {
    testsToRun.forEach((t) => run.started(t));

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const cwd = workspaceFolder
      ? workspaceFolder.uri.fsPath
      : path.dirname(uri.fsPath);

    if (debug) {
      await this.debugTest(uri, fileItem, run, testsToRun, cwd);
    } else {
      await this.executeTest(uri, fileItem, run, testsToRun, cwd);
    }
  }

  private async executeTest(
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    run: vscode.TestRun,
    testsToRun: vscode.TestItem[],
    cwd: string
  ) {
    // detect package manager and use exec to ensure we use the project's vitest
    const packageManager = await this.detectPackageManager(cwd);
    const args = [
      "exec",
      "--",
      "vitest",
      "run",
      uri.fsPath,
      "--reporter=json",
      "--no-color",
    ];

    try {
      const output = await this.execCommand(packageManager, args, cwd);      this.outputChannel.appendLine("=== Raw vitest output ===");
      this.outputChannel.appendLine(output);
      this.outputChannel.appendLine("=== End raw output ===");
            let result: any;

      try {
        // Find JSON in output - try to find the outermost JSON object
        const firstBrace = output.indexOf("{");
        const lastBrace = output.lastIndexOf("}");
        
        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
          // Log the actual output for debugging
          this.outputChannel.appendLine("=== No valid JSON structure found in vitest output ===");
          this.outputChannel.appendLine("Full output:");
          this.outputChannel.appendLine(output);
          this.outputChannel.show();
          vscode.window.showErrorMessage(
            `Failed to parse vitest output. No JSON found. Check 'Vitest Story' output panel for details.`
          );
          throw new Error("No JSON found in output");
        }
        
        const jsonStr = output.substring(firstBrace, lastBrace + 1);
        
        try {
          result = JSON.parse(jsonStr);
        } catch (parseError) {
          // If parsing fails, log the problematic JSON string
          this.outputChannel.appendLine("=== JSON parse error ===");
          this.outputChannel.appendLine(`Error: ${parseError}`);
          this.outputChannel.appendLine("Attempted to parse (first 1000 chars):");
          this.outputChannel.appendLine(jsonStr.substring(0, 1000));
          this.outputChannel.show();
          vscode.window.showErrorMessage(
            `Failed to parse vitest JSON output. Check 'Vitest Story' output panel for details.`
          );
          throw parseError;
        }
      } catch (e) {
        this.outputChannel.appendLine("=== Failed to parse vitest output ===");
        this.outputChannel.appendLine(`Error: ${e}`);
        this.outputChannel.show();
        throw new Error("Failed to parse vitest output");
      }

      if (result.testResults) {
        this.processTestResults(result, fileItem, run);
      } else {
        this.outputChannel.appendLine("=== Warning: No testResults found in vitest output ===");
        this.outputChannel.appendLine(JSON.stringify(result, null, 2));
        // Mark all tests as passed if no explicit results
        testsToRun.forEach((t) => run.passed(t));
      }
    } catch (e: any) {
      this.outputChannel.appendLine("=== Test execution error ===");
      this.outputChannel.appendLine(`Error: ${e}`);
      this.outputChannel.appendLine(`Stack: ${e.stack || 'No stack trace'}`);
      this.outputChannel.show();
      testsToRun.forEach((t) =>
        run.failed(t, new vscode.TestMessage(e.message || String(e)))
      );
    }
  }

  private async debugTest(
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    run: vscode.TestRun,
    testsToRun: vscode.TestItem[],
    cwd: string
  ) {
    try {
      // Start a debug session for vitest
      const packageManager = await this.detectPackageManager(cwd);
      const debugConfig: vscode.DebugConfiguration = {
        type: "node",
        request: "launch",
        name: "Debug Vitest Story",
        runtimeExecutable: packageManager,
        runtimeArgs: [
          "exec",
          "--",
          "vitest",
          "run",
          uri.fsPath,
          "--reporter=json",
          "--no-color",
        ],
        cwd: cwd,
        console: "integratedTerminal",
        internalConsoleOptions: "neverOpen",
        skipFiles: [
          "<node_internals>/**",
          "**/node_modules/**",
          "**/node_modules/.pnpm/**",
        ],
      };

      const success = await vscode.debug.startDebugging(
        vscode.workspace.getWorkspaceFolder(uri),
        debugConfig
      );

      if (!success) {
        testsToRun.forEach((t) =>
          run.failed(t, new vscode.TestMessage("Failed to start debugger"))
        );
        return;
      }

      // Wait for debug session to end
      await new Promise<void>((resolve) => {
        const disposable = vscode.debug.onDidTerminateDebugSession(
          (session) => {
            if (session.name === debugConfig.name) {
              disposable.dispose();
              resolve();
            }
          }
        );
      });

      // After debugging, run the test again to get results
      await this.executeTest(uri, fileItem, run, testsToRun, cwd);
    } catch (e: any) {
      testsToRun.forEach((t) =>
        run.failed(t, new vscode.TestMessage(e.message))
      );
    }
  }

  private processTestResults(
    result: any,
    fileItem: vscode.TestItem,
    run: vscode.TestRun
  ) {
    // Delegate to exported helper so we can unit test the logic
    processTestResultsForTest(result, fileItem, run);
  }

  private execCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.outputChannel.appendLine("\n=== Executing Command ===");
      this.outputChannel.appendLine(`Command: ${command} ${args.join(" ")}`);
      this.outputChannel.appendLine(`CWD: ${cwd}`);
      
      const child = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: "0" },
      });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
      });
      
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
      });

      child.on("close", (code) => {
        this.outputChannel.appendLine(`Process exited with code: ${code}`);
        if (stderr) {
          this.outputChannel.appendLine("=== Stderr ===");
          this.outputChannel.appendLine(stderr);
        }
        
        if (stdout) {
          resolve(stdout);
        } else if (code === 0 && stderr) {
          // Sometimes vitest outputs to stderr even on success
          resolve(stderr);
        } else {
          reject(
            new Error(`Command failed with code ${code}\nStderr: ${stderr}`)
          );
        }
      });
      
      child.on("error", (error) => {
        this.outputChannel.appendLine("=== Process error ===");
        this.outputChannel.appendLine(`Error: ${error}`);
        this.outputChannel.show();
        reject(error);
      });
    });
  }
}

/**
 * Exported helper for unit tests that processes vitest JSON results and maps them
 * to Test Items. It mirrors the behavior of the class method but is exported for
 * easier testing without instantiating the whole VS Code TestController.
 */
export function processTestResultsForTest(
  result: any,
  fileItem: any,
  run: any
) {
  // Helper to find a test item by label recursively
  const findTestItemByLabel = (parent: any, label: string): any | undefined => {
    let found: any | undefined;
    parent.children.forEach((child: any) => {
      if (child.label === label) {
        found = child;
      } else if (!found) {
        const nested = findTestItemByLabel(child, label);
        if (nested) found = nested;
      }
    });
    return found;
  };

  for (const fileResult of result.testResults) {
    for (const assertion of fileResult.assertionResults) {
      const testName = assertion.title;

      // Find the scenario item in children (search recursively to support Features)
      const scenarioItem = findTestItemByLabel(fileItem, testName);

      if (scenarioItem) {
        if (assertion.status === "passed") {
          // Mark scenario and all steps as passed
          run.passed(scenarioItem);
          scenarioItem.children.forEach((stepItem: any) => {
            run.passed(stepItem);
          });
        } else {
          // Parse the error message to find which step failed
          let failedStepFound = false;
          assertion.failureMessages.forEach((msg: string) => {
            // Extract the failed step text from messages formatted like:
            // "Step failed: "When I add 5"\nError: ..."
            const stepFailedMatch = msg.match(/Step failed:\s*"([^"]+)"/);

            if (stepFailedMatch && scenarioItem) {
              const failedStepText = stepFailedMatch[1];

              // Find the matching step item by text
              scenarioItem.children.forEach((stepItem: any) => {
                if (stepItem.label.includes(failedStepText)) {
                  run.failed(stepItem, { message: msg });
                  failedStepFound = true;
                }
              });
            }
          });

          // If we couldn't identify the specific step, mark the scenario as failed
          if (!failedStepFound) {
            const messages: any[] = [];
            assertion.failureMessages.forEach((msg: string) => {
              messages.push({ message: msg });
            });
            run.failed(scenarioItem, messages);
          }
        }
      }
    }
  }
} 