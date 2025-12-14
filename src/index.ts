#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { GranolaApiClient } from "./granola-api.js";
import { convertProseMirrorToMarkdown } from "./prosemirror-converter.js";

const apiClient = new GranolaApiClient();

const server = new Server(
  {
    name: "granola-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: "search_granola_notes",
    description:
      "Search through Granola notes/documents by query string. Returns matching documents with their content.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find matching notes/documents",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_granola_transcripts",
    description:
      "Search through Granola meeting transcripts by query string. Returns matching transcripts with their content.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find matching transcripts",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_granola_events",
    description:
      "Search through Granola calendar events by query string. Returns matching events with details.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find matching calendar events",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_granola_panels",
    description:
      "Search through Granola document panels (structured note sections) by query string.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find matching panels",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_granola_document",
    description: "Get a specific Granola document by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The document ID to retrieve",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_granola_transcript",
    description: "Get a specific Granola transcript by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The transcript ID to retrieve",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_granola_documents",
    description: "List all Granola documents with basic metadata.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of documents to return (default: 50)",
          default: 50,
        },
      },
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_granola_notes": {
        const query = args?.query as string;
        const limit = (args?.limit as number) || 10;
        const results = await apiClient.searchDocuments(query, limit);

        const processedResults = await Promise.all(
          results.map(async (doc) => {
            let markdown = "";
            let hasContent = false;

            if (
              doc.last_viewed_panel &&
              typeof doc.last_viewed_panel === "object" &&
              doc.last_viewed_panel.content &&
              typeof doc.last_viewed_panel.content === "object" &&
              doc.last_viewed_panel.content.type === "doc"
            ) {
              markdown = convertProseMirrorToMarkdown(
                doc.last_viewed_panel.content
              );
              hasContent = markdown.trim().length > 0;
            } else if (
              doc.notes &&
              typeof doc.notes === "object" &&
              doc.notes.type === "doc"
            ) {
              markdown = convertProseMirrorToMarkdown(doc.notes);
              hasContent = markdown.trim().length > 0;
            }

            return {
              id: doc.id,
              title: doc.title || "Untitled",
              markdown: markdown.substring(0, 2000) || "",
              content_preview: markdown.substring(0, 500) || "",
              has_content: hasContent,
              created_at: doc.created_at,
              updated_at: doc.updated_at,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  count: processedResults.length,
                  results: processedResults,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "search_granola_transcripts": {
        const query = args?.query as string;
        const limit = (args?.limit as number) || 10;
        const results = await apiClient.searchDocuments(query, limit);

        const transcriptResults = results
          .filter((doc) => doc.type === "meeting")
          .map((doc) => {
            let markdown = "";
            if (doc.last_viewed_panel?.content) {
              markdown = convertProseMirrorToMarkdown(
                doc.last_viewed_panel.content
              );
            }
            return {
              id: doc.id,
              meeting_id: doc.id,
              title: doc.title,
              content: markdown.substring(0, 1000) || "",
            };
          })
          .slice(0, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  count: transcriptResults.length,
                  results: transcriptResults,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "search_granola_events": {
        const query = args?.query as string;
        const limit = (args?.limit as number) || 10;
        const allDocs = await apiClient.getAllDocuments();

        const eventResults = allDocs
          .filter((doc) => {
            const event = doc.google_calendar_event;
            if (!event) return false;
            const summary = event.summary?.toLowerCase() || "";
            const description = event.description?.toLowerCase() || "";
            const lowerQuery = query.toLowerCase();
            return (
              summary.includes(lowerQuery) || description.includes(lowerQuery)
            );
          })
          .slice(0, limit)
          .map((doc) => ({
            id: doc.google_calendar_event?.id || doc.id,
            summary: doc.google_calendar_event?.summary,
            description: doc.google_calendar_event?.description?.substring(
              0,
              500
            ),
            start: doc.google_calendar_event?.start,
            end: doc.google_calendar_event?.end,
            attendees: doc.google_calendar_event?.attendees,
            htmlLink: doc.google_calendar_event?.htmlLink,
          }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  count: eventResults.length,
                  results: eventResults,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "search_granola_panels": {
        const query = args?.query as string;
        const limit = (args?.limit as number) || 10;
        const results = await apiClient.searchDocuments(query, limit);

        const panelResults = results
          .filter((doc) => doc.last_viewed_panel)
          .map((doc) => {
            const panel = doc.last_viewed_panel;
            let markdown = "";
            if (panel?.content) {
              markdown = convertProseMirrorToMarkdown(panel.content);
            }
            return {
              id: panel?.id || doc.id,
              document_id: doc.id,
              heading: panel?.heading || doc.title,
              content: markdown.substring(0, 500) || "",
            };
          })
          .slice(0, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  count: panelResults.length,
                  results: panelResults,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_granola_document": {
        const id = args?.id as string;
        const doc = await apiClient.getDocumentById(id);
        if (!doc) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Document with id ${id} not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        let markdown = "";
        if (
          doc.last_viewed_panel &&
          typeof doc.last_viewed_panel === "object" &&
          doc.last_viewed_panel.content &&
          typeof doc.last_viewed_panel.content === "object" &&
          doc.last_viewed_panel.content.type === "doc"
        ) {
          markdown = convertProseMirrorToMarkdown(
            doc.last_viewed_panel.content
          );
        } else if (
          doc.notes &&
          typeof doc.notes === "object" &&
          doc.notes.type === "doc"
        ) {
          markdown = convertProseMirrorToMarkdown(doc.notes);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: doc.id,
                  title: doc.title || "Untitled",
                  markdown,
                  created_at: doc.created_at,
                  updated_at: doc.updated_at,
                  metadata: {
                    type: doc.type,
                    people: doc.people,
                    google_calendar_event: doc.google_calendar_event,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_granola_transcript": {
        const id = args?.id as string;
        const doc = await apiClient.getDocumentById(id);
        if (!doc || doc.type !== "meeting") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Transcript with id ${id} not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        let markdown = "";
        if (doc.last_viewed_panel?.content) {
          markdown = convertProseMirrorToMarkdown(
            doc.last_viewed_panel.content
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: doc.id,
                  meeting_id: doc.id,
                  title: doc.title,
                  content: markdown,
                  created_at: doc.created_at,
                  updated_at: doc.updated_at,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_granola_documents": {
        const limit = (args?.limit as number) || 50;
        const allDocs = await apiClient.getAllDocuments();
        const docs = allDocs.slice(0, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: docs.length,
                  documents: docs.map((doc) => ({
                    id: doc.id,
                    title: doc.title || "Untitled",
                    created_at: doc.created_at,
                    updated_at: doc.updated_at,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Granola MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
