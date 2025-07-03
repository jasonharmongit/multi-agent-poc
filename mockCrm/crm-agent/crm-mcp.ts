import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function getServer() {
  const mcp = new McpServer({
    name: "MinimalCrmServer",
    version: "1.0.0",
  });

  mcp.registerTool(
    "get_crm_history",
    {
      title: "Get CRM History",
      description:
        "Input: the name of the contact, as a pure json object: {name: string}. Example: {name: 'John Doe'}. BAD EXAMPLE (don't do this!!!!): {name: \\'John Doe\\'}. Do NOT try to use backslashes in the input. Returns static CRM history for a contact.",
      inputSchema: {
        name: z.string().describe("Contact's full name"),
      },
    },
    async ({ name }) => {
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

  return mcp;
}
