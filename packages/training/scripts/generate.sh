#!/bin/bash
# Batch generation script for synthetic training data.
#
# Usage:
#   ./scripts/generate.sh [count]
#
# Examples:
#   ./scripts/generate.sh 1000      # Generate 1000 examples
#   ./scripts/generate.sh 50000     # Generate 50K examples (default target)
#
# Environment variables:
#   ANTHROPIC_API_KEY - Required for API annotation (or use --synthetic)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

COUNT="${1:-50000}"

echo "======================================"
echo "vcad Training Data Generation"
echo "======================================"
echo "Count: $COUNT"
echo "Output: $PACKAGE_DIR/data/"
echo ""

# Check if we have API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Warning: ANTHROPIC_API_KEY not set"
  echo "Using synthetic descriptions instead of Claude API"
  SYNTHETIC_FLAG="--synthetic"
else
  echo "Using Claude API for annotations"
  SYNTHETIC_FLAG=""
fi

echo ""
echo "Starting pipeline..."

cd "$PACKAGE_DIR"

# Run the full pipeline
npx tsx src/cli.ts pipeline \
  --count "$COUNT" \
  --output data \
  $SYNTHETIC_FLAG \
  --validate

echo ""
echo "======================================"
echo "Generation Complete!"
echo "======================================"
echo ""
echo "Output files:"
echo "  data/train.jsonl"
echo "  data/val.jsonl"
echo "  data/test.jsonl"
echo ""
echo "To view statistics:"
echo "  npm run -w @vcad/training stats"
