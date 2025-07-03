#!/bin/bash

# List of npm scripts to run (from your package.json)
SCRIPTS=(
  "crm-db"
  "crm-mcp"
  "crm-agent"
  "search-mcp"
  "search-agent"
  # "super-mcp"
  "super-agent"
)

for SCRIPT in "${SCRIPTS[@]}"
do
  osascript <<EOF
tell application "Terminal"
    activate
    do script "cd \"$(pwd)\"; pnpm run $SCRIPT"
end tell
EOF
done