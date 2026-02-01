#!/bin/bash
cd "$(dirname "$0")"
export $(grep -v '^#' ../../.env | xargs)
exec node --loader ts-node/esm src/cli.ts annotate \
  -i data/raw/all.jsonl \
  -o data/annotated/all.jsonl \
  --gateway "anthropic/claude-3-5-haiku-latest" \
  --prompts 1
