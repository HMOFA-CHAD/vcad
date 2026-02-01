#!/bin/bash
cd "$(dirname "$0")"
exec node --loader ts-node/esm src/cli.ts annotate \
  -i data/raw/all.jsonl \
  -o data/annotated/all.jsonl \
  --ollama qwen2.5:3b \
  --prompts 1
