#!/bin/bash

# Setup script for Granola MCP Server
# This helps configure the MCP server in Cursor

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_PATH="$SCRIPT_DIR/dist/index.js"

echo "Granola MCP Server Setup"
echo "========================"
echo ""
echo "Build path: $BUILD_PATH"
echo ""

# Check if build exists
if [ ! -f "$BUILD_PATH" ]; then
    echo "❌ Build not found. Running build..."
    cd "$SCRIPT_DIR"
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
fi

echo "✅ Build found!"
echo ""
echo "Add this to your Cursor MCP configuration (.cursor/mcp.json):"
echo ""
echo "{"
echo "  \"mcpServers\": {"
echo "    \"granola\": {"
echo "      \"command\": \"node\","
echo "      \"args\": ["
echo "        \"$BUILD_PATH\""
echo "      ]"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "After adding this configuration, restart Cursor to load the MCP server."

