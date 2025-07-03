import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fetch from "node-fetch";
import { z } from "zod";

export function getServer() {
  const mcp = new McpServer({
    name: "CrmAgentMCPServer",
    version: "1.0.0",
  });

  mcp.registerTool(
    "get_crm_history",
    {
      title: "Get CRM History",
      description:
        "Input: the name of the contact as a JSON object. Example: {name: 'John Doe'}. Returns an object with the contact's full name, email, last activity date, and an array of activity history objects (id, type, date, description) for the contact. If no contact is found, returns an error field.",
      inputSchema: {
        name: z.string().describe("Contact's full name"),
      },
    },
    async ({ name }) => {
      // Split name into first and last
      const [first_name, ...rest] = name.split(" ");
      const last_name = rest.join(" ");
      // GraphQL query to search contact by first and last name
      const query = `query Search($first_name: String, $last_name: String) {
        searchContactsByFields(first_name: $first_name, last_name: $last_name) {
          id
          first_name
          last_name
          email
          activities {
            id
            type
            date
            description
          }
        }
      }`;
      const variables = { first_name, last_name };
      const res = await fetch(`http://localhost:${process.env.CRM_MOCK_DB_PORT}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const data: any = await res.json();
      const contact = data.data?.searchContactsByFields?.[0];
      if (!contact) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `No contact found for ${name}` }),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              history: contact.activities,
              lastActivity: contact.activities?.[0]?.date || null,
              contact: `${contact.first_name} ${contact.last_name}`,
              email: contact.email,
            }),
          },
        ],
      };
    }
  );

  return mcp;
}
