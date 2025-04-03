#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the Deno script with all arguments passed through
deno run --allow-all "$SCRIPT_DIR/src/cli.ts" "$@" 