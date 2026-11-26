#!/usr/bin/env bash
set -euo pipefail

exec node scripts/check-all.mjs "$@"
