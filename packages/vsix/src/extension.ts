import * as vscode from "vscode";
import { VitestStoryTestController } from "./test-controller";

export function activate(context: vscode.ExtensionContext) {
  console.log("Vitest Story extension is now active!");

  const testController = new VitestStoryTestController(context);
  context.subscriptions.push(testController);
}

export function deactivate() {}
