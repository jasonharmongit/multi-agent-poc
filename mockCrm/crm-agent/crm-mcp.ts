import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fileURLToPath } from "url";
import { z } from "zod";

// Create the MCP server instance
const mcp = new McpServer({
  name: "MinimalCrmServer",
  version: "1.0.0",
});

// Register a tool (like @mcp.tool in Python)
mcp.registerTool(
  "get_crm_history",
  {
    title: "Get CRM History",
    description: "Returns static CRM history for a contact.",
    inputSchema: {
      name: z.string().describe("Contact's full name"),
    },
  },
  async ({ name }) => {
    // Return static/dummy CRM data as text
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            history: `crm history for ${name}`,
            lastActivity: "2025-07-01",
          }),
        },
      ],
    };
  }
);

// Optionally, export the server for use in other modules
export default mcp;

// If run directly, start the server using stdio transport
// This is the ESM-safe equivalent of if (require.main === module).
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(`file://${process.argv[1]}`)) {
  // If run directly, start the server using stdio transport
  import("@modelcontextprotocol/sdk/server/stdio.js").then(({ StdioServerTransport }) => {
    const transport = new StdioServerTransport();
    mcp
      .connect(transport)
      .then(() => {
        console.error("CRM MCP Server running on stdio");
      })
      .catch((error) => {
        console.error("Fatal error in main():", error);
        process.exit(1);
      });
  });
}
