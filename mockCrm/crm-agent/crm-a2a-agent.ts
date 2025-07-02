import { A2AExpressApp, AgentCard, createTaskHandler } from "@a2a-js/sdk";
import express, { Express } from "express";
import { createCrmMcpServer } from "./crm-mcp.js";

export function createCrmAgentApp(): { app: Express; port: number } {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  const mcp = createCrmMcpServer();

  const agentCard: AgentCard = {
    name: "CRM Research Agent",
    description: "Fetches CRM data from GraphQL backend via MCP",
    url: `http://localhost:${PORT}`,
    provider: {
      organization: "Your Organization",
      url: "https://your-org.com",
    },
    version: "1.0.0",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    securitySchemes: undefined,
    security: undefined,
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: [
      {
        id: "fetch-crm-history",
        name: "Fetch CRM History",
        description: "Get CRM contact history",
        tags: ["crm", "history", "contact"],
        examples: ["Show me the CRM history for John Doe.", "Get all activities for Jane Smith."],
        inputModes: ["text/plain"],
        outputModes: ["text/plain"],
      },
    ],
    supportsAuthenticatedExtendedCard: false,
  };

  const a2a = new A2AExpressApp({ agentCard });

  a2a.registerTaskHandler(
    "fetch-crm-history",
    createTaskHandler(async ({ task, update, complete }) => {
      const text = task.input[0]?.parts[0]?.text || "";
      const match = text.match(/for (.+)/i);
      if (!match) throw new Error("No contact name found");

      const contactName = match[1];

      update({ parts: [{ text: `Loading CRM data for ${contactName}...` }] });

      const uri = new URL(`crm://contact/${encodeURIComponent(contactName)}`);
      const resourceResult = await mcp.getResource(uri);

      const crmData = JSON.parse(resourceResult.contents[0].text);

      const summaryResult = await mcp.callTool("summarizeCrm", { history: crmData.history });

      complete({
        parts: [{ text: `CRM Data: ${crmData.history}` }, { text: `Summary: ${summaryResult.content[0].text}` }],
      });
    })
  );

  a2a.mount(app);

  return { app, port: PORT };
}
