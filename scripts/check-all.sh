#!/usr/bin/env bash
set -euo pipefail

echo "==> Running svelte-check..."
pnpm check

echo "==> Running vitest..."
pnpm exec vitest run

echo "==> Running production build..."
pnpm build

echo "==> All checks passed!"
