import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { spawn } from "child_process";
import fetch from "node-fetch";
import { z } from "zod";

export function getServer() {
  const mcp = new McpServer({
    name: "SuperAgentMCPServer",
    version: "1.0.0",
  });

  mcp.registerTool(
    "get_agent_info",
    {
      title: "Get information for the agents you have access to",
      description: "No input is needed. Returns a list of agents you have access to and their capabilities.",
    },
    async () => {
      // Well-known URLs for the agent cards
      const crmAgentUrl = `http://localhost:${process.env.CRM_AGENT_PORT}/agent-card`;
      const searchAgentUrl = `http://localhost:${process.env.SEARCH_AGENT_PORT}/agent-card`;
      const [crmRes, searchRes] = await Promise.all([fetch(crmAgentUrl), fetch(searchAgentUrl)]);
      const [crmCard, searchCard] = await Promise.all([crmRes.json(), searchRes.json()]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              { agent: "CRM Agent", card: crmCard },
              { agent: "Search Agent", card: searchCard },
            ]),
          },
        ],
      };
    }
  );

  mcp.registerTool(
    "stream_agent_task",
    {
      title: "Stream a task to an agent",
      description:
        "Input: agentName (e.g., 'CRM Agent' or 'Research Agent') and taskMessage (a directive for the agent to follow). Example: {agentName: 'CRM Agent', taskMessage: 'Pull CRM History for John Doe'} Streams the agent's response.",
      inputSchema: {
        agentName: z.string().describe("The name of the agent to send the message to."),
        taskMessage: z.string().describe("The message to send to the agent."),
      },
    },
    async ({ agentName, taskMessage }) => {
      return new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [require.resolve("./stream-task.ts"), agentName, taskMessage], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        proc.stdout.on("data", (data) => {
          output += data.toString();
        });
        proc.stderr.on("data", (data) => {
          output += data.toString();
        });
        proc.on("close", (code) => {
          resolve({
            content: [
              {
                type: "text",
                text: output,
              },
            ],
          });
        });
        proc.on("error", (err) => {
          reject(err);
        });
      });
    }
  );

  return mcp;
}
