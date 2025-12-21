import { createSteps } from "vitest-story";

type System = {
  extractionStarted: boolean;
  extractedData: Map<string, string>;
};

type Ctx = {
  system: System;
};

const { Given, When, Then } = createSteps<Ctx>();

const system: System = {
  extractionStarted: false,
  extractedData: new Map<string, string>(),
};

Given("I start extracting text", (ctx) => {
  ctx.system = system;
  ctx.system.extractionStarted = true;
});

When("AI extracts text from the document:", (ctx, params) => {
  if (!ctx.system.extractionStarted) {
    throw new Error("Extraction has not been started");
  }
  // Simulate AI text extraction
  const extractedText = params?.yaml ?? "";
  ctx.system.extractedData.set("documentText", extractedText);
});

Then("the extracted text should be stored", (ctx) => {
  const extractedText = ctx.system.extractedData.get("documentText");
  if (!extractedText) {
    throw new Error("No text was extracted");
  }
  // Here we would normally store the extracted text, but for this example, we'll just log it
  console.log("Extracted Text:", extractedText);
});
