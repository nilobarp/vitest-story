import * as vscode from "vscode";
import { VitestStoryTestController } from "./test-controller";
import { StepDefinitionProvider } from "./step-definition-provider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Vitest Story extension is now active!");
  
  const outputChannel = vscode.window.createOutputChannel("Vitest Story");
  outputChannel.appendLine("Vitest Story extension activated");
  context.subscriptions.push(outputChannel);

  const testController = new VitestStoryTestController(context, outputChannel);
  context.subscriptions.push(testController);

  // Register the step definition provider for TypeScript and JavaScript
  const stepDefinitionProvider = new StepDefinitionProvider();
  context.subscriptions.push(stepDefinitionProvider);

  const selector: vscode.DocumentSelector = [
    { language: "typescript", scheme: "file" },
    { language: "javascript", scheme: "file" },
    { language: "story", scheme: "file" },
  ];

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      selector,
      stepDefinitionProvider
    )
  );
}

export function deactivate() {}
