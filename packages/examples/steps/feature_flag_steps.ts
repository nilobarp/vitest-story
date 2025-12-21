/**
 * Feature flag and price extraction step definitions
 */

import { Given, When, Then } from "vitest-story";
import { expect } from "vitest";

// Feature flag setup
Given('the "{flag}" feature flag is enabled', (ctx, params) => {
  if (!ctx.featureFlags) {
    ctx.featureFlags = {};
  }
  ctx.featureFlags[params.flag] = true;
});

// Price extraction steps
Given("I start extracting prices", (ctx) => {
  if (!ctx.priceExtractions) {
    ctx.priceExtractions = {};
  }
  ctx.extractionStarted = true;
});

Given('AI extracts prices for "{vendor}":', (ctx, params) => {
  if (!ctx.priceExtractions) {
    ctx.priceExtractions = {};
  }
  
  // The YAML data will be available in params.yaml
  // Make sure we have the yaml parameter
  if (!params.yaml) {
    throw new Error(`Expected YAML data for vendor ${params.vendor} but got: ${JSON.stringify(params)}`);
  }
  
  ctx.priceExtractions[params.vendor] = params.yaml;
});

Then('"{vendor}" has prices extracted', (ctx, params) => {
  expect(ctx.priceExtractions).toBeDefined();
  expect(ctx.priceExtractions[params.vendor]).toBeDefined();
  
  const extraction = ctx.priceExtractions[params.vendor];
  expect(extraction.materials).toBeDefined();
  expect(extraction.labor).toBeDefined();
  expect(extraction.materials.length).toBeGreaterThan(0);
});
