import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";

export class VitestStoryTestController implements vscode.Disposable {
  private controller: vscode.TestController;
  private watcher: vscode.FileSystemWatcher;

  constructor(private context: vscode.ExtensionContext) {
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

    this.watcher = vscode.workspace.createFileSystemWatcher(
      "**/*.{test,spec}.{ts,js}"
    );
    this.watcher.onDidChange((uri) => this.updateTestsInFile(uri));
    this.watcher.onDidCreate((uri) => this.updateTestsInFile(uri));
    this.watcher.onDidDelete((uri) => this.removeTestsInFile(uri));

    // Initial scan
    this.scanWorkspace();
  }

  dispose() {
    this.controller.dispose();
    this.watcher.dispose();
  }

  private async scanWorkspace() {
    const files = await vscode.workspace.findFiles(
      "**/*.{test,spec}.{ts,js}",
      "**/node_modules/**"
    );
    for (const file of files) {
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

    const storyRegex = /story\s*`([\s\S]*?)`/g;
    let match;
    const children: vscode.TestItem[] = [];

    while ((match = storyRegex.exec(text)) !== null) {
      const content = match[1];
      const startOffset = match.index;

      const scenarioRegex = /Scenario:\s*(.+)/g;
      let scenarioMatch;

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

        children.push(scenarioItem);
      }
    }

    if (children.length > 0) {
      fileItem.children.replace(children);
      this.controller.items.add(fileItem);
    } else {
      this.controller.items.delete(fileId);
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
    // Mark started
    testsToRun.forEach((t) => run.started(t));

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const cwd = workspaceFolder
      ? workspaceFolder.uri.fsPath
      : path.dirname(uri.fsPath);

    if (debug) {
      // Start debugging session
      await this.debugTest(uri, fileItem, run, testsToRun, cwd);
    } else {
      // Run tests normally
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
    // We run the whole file.
    // Use pnpm exec to ensure we use the project's vitest
    const args = ["exec", "vitest", "run", uri.fsPath, "--reporter=json"];

    try {
      const output = await this.execCommand("pnpm", args, cwd);
      let result: any;

      try {
        // Find JSON in output
        const firstBrace = output.indexOf("{");
        const lastBrace = output.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          const jsonStr = output.substring(firstBrace, lastBrace + 1);
          result = JSON.parse(jsonStr);
        } else {
          throw new Error("No JSON found in output");
        }
      } catch (e) {
        console.error("Failed to parse vitest output:", output);
        throw new Error("Failed to parse vitest output");
      }

      if (result.testResults) {
        this.processTestResults(result, fileItem, run);
      }
    } catch (e: any) {
      testsToRun.forEach((t) =>
        run.failed(t, new vscode.TestMessage(e.message))
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
      const debugConfig: vscode.DebugConfiguration = {
        type: "node",
        request: "launch",
        name: "Debug Vitest Story",
        runtimeExecutable: "pnpm",
        runtimeArgs: ["exec", "vitest", "run", uri.fsPath],
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
    for (const fileResult of result.testResults) {
      for (const assertion of fileResult.assertionResults) {
        const testName = assertion.title;

        // Find the scenario item in children
        let scenarioItem: vscode.TestItem | undefined;
        fileItem.children.forEach((child) => {
          if (child.label === testName) {
            scenarioItem = child;
          }
        });

        if (scenarioItem) {
          if (assertion.status === "passed") {
            // Mark scenario and all steps as passed
            run.passed(scenarioItem);
            scenarioItem.children.forEach((stepItem) => {
              run.passed(stepItem);
            });
          } else {
            // Parse the error message to find which step failed
            let failedStepFound = false;
            assertion.failureMessages.forEach((msg: string) => {
              // Extract step line number from error message
              // Error format: "Step failed: "keyword text""
              const stepFailedMatch = msg.match(/Step failed: "(.+)"/);

              if (stepFailedMatch && scenarioItem) {
                const failedLineNumber = parseInt(stepFailedMatch[1], 10);
                const failedStepText = stepFailedMatch[2];

                // Find the matching step item
                let foundStep = false;
                scenarioItem.children.forEach((stepItem) => {
                  if (
                    stepItem.range &&
                    stepItem.range.start.line === failedLineNumber - 1
                  ) {
                    // Found the failed step
                    run.failed(stepItem, new vscode.TestMessage(msg));
                    foundStep = true;
                    failedStepFound = true;
                  }
                });

                // If we didn't find by line number, try to match by text
                if (!foundStep) {
                  scenarioItem.children.forEach((stepItem) => {
                    if (stepItem.label.includes(failedStepText)) {
                      run.failed(stepItem, new vscode.TestMessage(msg));
                      failedStepFound = true;
                    }
                  });
                }
              }
            });

            // If we couldn't identify the specific step, mark the scenario as failed
            if (!failedStepFound) {
              const messages: vscode.TestMessage[] = [];
              assertion.failureMessages.forEach((msg: string) => {
                messages.push(new vscode.TestMessage(msg));
              });
              run.failed(scenarioItem, messages);
            }
          }
        }
      }
    }
  }

  private async rerunForResults(
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    run: vscode.TestRun,
    testsToRun: vscode.TestItem[],
    cwd: string
  ) {
    const args = ["exec", "vitest", "run", uri.fsPath, "--reporter=json"];

    try {
      const output = await this.execCommand("pnpm", args, cwd);
      let result: any;

      try {
        const firstBrace = output.indexOf("{");
        const lastBrace = output.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          const jsonStr = output.substring(firstBrace, lastBrace + 1);
          result = JSON.parse(jsonStr);
        } else {
          throw new Error("No JSON found in output");
        }
      } catch (e) {
        console.error("Failed to parse vitest output:", output);
        throw new Error("Failed to parse vitest output");
      }

      if (result.testResults) {
        for (const fileResult of result.testResults) {
          for (const assertion of fileResult.assertionResults) {
            const testName = assertion.title;

            // Find the scenario item in children
            let scenarioItem: vscode.TestItem | undefined;
            fileItem.children.forEach((child) => {
              if (child.label === testName) {
                scenarioItem = child;
              }
            });

            if (scenarioItem) {
              if (assertion.status === "passed") {
                // Mark scenario and all steps as passed
                run.passed(scenarioItem);
                scenarioItem.children.forEach((stepItem) => {
                  run.passed(stepItem);
                });
              } else {
                // Parse the error message to find which step failed
                let failedStepFound = false;
                assertion.failureMessages.forEach((msg: string) => {
                  // Extract step line number from error message
                  // Error format: "Step failed: "keyword text""
                  const stepFailedMatch = msg.match(/Step failed: "(.+)"/);

                  if (stepFailedMatch && scenarioItem) {
                    const failedLineNumber = parseInt(stepFailedMatch[1], 10);
                    const failedStepText = stepFailedMatch[2];

                    // Find the matching step item
                    let foundStep = false;
                    scenarioItem.children.forEach((stepItem) => {
                      if (
                        stepItem.range &&
                        stepItem.range.start.line === failedLineNumber - 1
                      ) {
                        // Found the failed step
                        run.failed(stepItem, new vscode.TestMessage(msg));
                        foundStep = true;
                        failedStepFound = true;
                      }
                    });

                    // If we didn't find by line number, try to match by text
                    if (!foundStep) {
                      scenarioItem.children.forEach((stepItem) => {
                        if (stepItem.label.includes(failedStepText)) {
                          run.failed(stepItem, new vscode.TestMessage(msg));
                          failedStepFound = true;
                        }
                      });
                    }
                  }
                });

                // If we couldn't identify the specific step, mark the scenario as failed
                if (!failedStepFound) {
                  const messages: vscode.TestMessage[] = [];
                  assertion.failureMessages.forEach((msg: string) => {
                    messages.push(new vscode.TestMessage(msg));
                  });
                  run.failed(scenarioItem, messages);
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      testsToRun.forEach((t) =>
        run.failed(t, new vscode.TestMessage(e.message))
      );
    }
  }

  private execCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env, FORCE_COLOR: "0" },
      });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => (stdout += data));
      child.stderr.on("data", (data) => (stderr += data));

      child.on("close", (code) => {
        if (stdout) {
          resolve(stdout);
        } else {
          reject(
            new Error(`Command failed with code ${code}\nStderr: ${stderr}`)
          );
        }
      });
    });
  }
}
