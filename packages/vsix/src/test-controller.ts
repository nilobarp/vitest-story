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
      (request, token) => this.runTests(request, token)
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
        // Calculate position
        // The content starts at startOffset + length of "story`" (approx, need to be careful)
        // Actually match[0] is the whole string including story`...`
        // match[1] is the content inside backticks.
        // So content starts at match.index + match[0].indexOf(match[1])

        const contentStart = match[0].indexOf(match[1]);
        const scenarioStartInContent = scenarioMatch.index;
        const absoluteOffset =
          startOffset + contentStart + scenarioStartInContent;

        const position = this.getPositionAt(text, absoluteOffset);

        const testId = `${fileId}::${title}`;
        const testItem = this.controller.createTestItem(testId, title, uri);
        testItem.range = new vscode.Range(position, position);
        children.push(testItem);
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
    token: vscode.CancellationToken
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
        await this.runFile(uri, fileItem, run, tests);
      }
    }

    run.end();
  }

  private async runFile(
    uri: vscode.Uri,
    fileItem: vscode.TestItem,
    run: vscode.TestRun,
    testsToRun: vscode.TestItem[]
  ) {
    // Mark started
    testsToRun.forEach((t) => run.started(t));

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const cwd = workspaceFolder
      ? workspaceFolder.uri.fsPath
      : path.dirname(uri.fsPath);

    // We run the whole file.
    // Optimization: if only one test is selected, we could use -t
    // But for simplicity, run the file.
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
        for (const fileResult of result.testResults) {
          for (const assertion of fileResult.assertionResults) {
            const testName = assertion.title;

            // Find the test item in children
            let testItem: vscode.TestItem | undefined;
            fileItem.children.forEach((child) => {
              if (child.label === testName) {
                testItem = child;
              }
            });

            if (testItem) {
              // Only update if it was requested to run (or if we want to update everything we ran)
              // It's better to update everything we have results for.
              if (assertion.status === "passed") {
                run.passed(testItem);
              } else {
                const messages: vscode.TestMessage[] = [];
                assertion.failureMessages.forEach((msg: string) => {
                  messages.push(new vscode.TestMessage(msg));
                });
                run.failed(testItem, messages);
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
