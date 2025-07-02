import { A2AExpressApp, DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk";
import dotenv from "dotenv";
import express from "express";
import { CrmOpenAIAgent, fetchMcpTools } from "./crm-openai-agent.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "localhost";

// Define the agent card (metadata)
const getCrmAgentCard = () => ({
  name: "CRM Agent",
  description: "Fetches CRM data from GraphQL backend via MCP",
  url: `http://${HOST}:${PORT}/`,
  version: "1.0.0",
  defaultInputModes: CrmOpenAIAgent.SUPPORTED_CONTENT_TYPES,
  defaultOutputModes: CrmOpenAIAgent.SUPPORTED_CONTENT_TYPES,
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  skills: [
    {
      id: "fetch-crm-history",
      name: "Fetch CRM History",
      description: "Get CRM contact history",
      tags: ["crm", "history", "contact"],
      examples: ["Show me the CRM history for John Doe."],
    },
  ],
});

class CrmAgentExecutor {
  private crmOpenAIAgent: CrmOpenAIAgent;
  constructor(crmOpenAIAgent: CrmOpenAIAgent) {
    this.crmOpenAIAgent = crmOpenAIAgent;
  }
  async execute(task: any): Promise<void> {
    const text = task.input?.[0]?.parts?.[0]?.text || "";
    const result = await this.crmOpenAIAgent.invoke(text, task.id);
    task.result = {
      parts: [{ text: result.content }],
    };
  }
  async cancelTask(_taskId: string): Promise<void> {
    // No-op for now
    return Promise.resolve();
  }
}

export async function createCrmAgentApp() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not set.");
  }

  // Fetch MCP tools and create the agent
  const tools = await fetchMcpTools();
  const crmAgent = new CrmOpenAIAgent(tools);

  // Set up the A2A protocol-compliant server
  const agentCard = getCrmAgentCard();
  const taskStore = new InMemoryTaskStore();
  const agentExecutor = new CrmAgentExecutor(crmAgent);
  const requestHandler = new DefaultRequestHandler(agentCard, taskStore, agentExecutor);
  const appBuilder = new A2AExpressApp(requestHandler);
  const app = appBuilder.setupRoutes(express(), "");

  return { app, port: PORT };
}
