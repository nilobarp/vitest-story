#!/bin/bash

# Tag Support Demonstration for vitest-story

echo "=============================================="
echo "Tag Support Demonstration"
echo "=============================================="
echo ""

cd "$(dirname "$0")/packages/examples"

echo "1. Running all tests (no filter)"
echo "----------------------------------------------"
pnpm test calculator-with-tags.story 2>&1 | grep -E "(Test Files|Tests)"
echo ""

echo "2. Running only @fast tagged scenarios"
echo "----------------------------------------------"
VITEST_STORY_TAGS=fast pnpm test calculator-with-tags.story 2>&1 | grep -E "(Test Files|Tests)"
echo ""

echo "3. Running only @slow tagged scenarios"
echo "----------------------------------------------"
VITEST_STORY_TAGS=slow pnpm test calculator-with-tags.story 2>&1 | grep -E "(Test Files|Tests)"
echo ""

echo "4. Running with non-matching tag (all skipped)"
echo "----------------------------------------------"
VITEST_STORY_TAGS=nonexistent pnpm test calculator-with-tags.story 2>&1 | grep -E "(Test Files|Tests)"
echo ""

echo "=============================================="
echo "Note: The @skip tagged scenario is always skipped"
echo "regardless of tag filtering"
echo "=============================================="
