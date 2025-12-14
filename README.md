# Granola MCP Server

A Model Context Protocol (MCP) server that provides access to your Granola notes, documents, transcripts, and calendar events using the Granola API.

## Features

- 🔍 **Search Notes**: Search through all your Granola documents/notes
- 📝 **Search Transcripts**: Find meeting transcripts by content
- 📅 **Search Events**: Search calendar events
- 📋 **Search Panels**: Search structured note panels
- 📄 **Get Documents**: Retrieve specific documents by ID
- 📊 **List Documents**: List all available documents

## Installation

1. Install dependencies:

```bash
cd granola-mcp-server
npm install
```

2. Build the server:

```bash
npm run build
```

## Configuration in Cursor

Add this to your Cursor MCP configuration (usually in `.cursor/mcp.json` or Cursor Settings):

```json
{
  "mcpServers": {
    "granola": {
      "command": "node",
      "args": ["/absolute/path/to/granola-mcp-server/dist/index.js"]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/granola-mcp-server/dist/index.js` with the actual absolute path to your built server.

## Usage

Once configured, you can use the MCP tools in Cursor:

- `search_granola_notes` - Search documents by query
- `search_granola_transcripts` - Search meeting transcripts
- `search_granola_events` - Search calendar events
- `search_granola_panels` - Search document panels
- `get_granola_document` - Get a specific document
- `get_granola_transcript` - Get a specific transcript
- `list_granola_documents` - List all documents

## How It Works

The server uses Granola's API with credentials stored locally at:

```
~/Library/Application Support/Granola/supabase.json
```

It fetches data from the Granola API and provides search/retrieval capabilities over:

- Documents (notes)
- Meeting transcripts
- Calendar events
- Document panels (structured note sections)

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run directly
npm start
```

## Notes

- Requires Granola to be installed and logged in (credentials are read from local config)
- Data is fetched from the Granola API in real-time

