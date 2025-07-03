import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function getServer() {
  const mcp = new McpServer({
    name: "SearchAgentMCPServer",
    version: "1.0.0",
  });

  mcp.registerTool(
    "search_internet",
    {
      title: "Search the internet",
      description:
        "Input: The query to search the internet for. Example: {query: 'Find recent company news about Acme Inc.'}",
      inputSchema: {
        query: z.string().describe("The query to search the internet for"),
      },
    },
    async ({ query }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              results: [
                {
                  headline: "Acme Inc. launches new eco-friendly product line",
                  content:
                    "Acme Inc. announced the launch of its new eco-friendly product line, aiming to reduce environmental impact. (2024-06-10)",
                },
                {
                  headline: "Acme Inc. partners with Example Corp for global expansion",
                  content:
                    "Acme Inc. and Example Corp have entered a strategic partnership to expand their global reach. (2024-06-05)",
                },
                {
                  headline: "Acme Inc. reports record Q2 profits",
                  content:
                    "Acme Inc. has reported record profits for the second quarter of 2024, exceeding analyst expectations. (2024-06-01)",
                },
              ],
            }),
          },
        ],
      };
    }
  );

  return mcp;
}
