import { A2AExpressApp, AgentExecutor, DefaultRequestHandler, InMemoryTaskStore, TaskStore } from "@a2a-js/sdk";
import express from "express";
import CrmAgentExecutor, { crmAgentCard } from "./crm-a2a-agent.js";

const taskStore: TaskStore = new InMemoryTaskStore();
const agentExecutor: AgentExecutor = await CrmAgentExecutor.create();

const requestHandler = new DefaultRequestHandler(crmAgentCard(), taskStore, agentExecutor);

const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express(), "");

const PORT = process.env.CRM_AGENT_PORT || 8000; // Different port for coder agent
expressApp.listen(PORT, () => {
  console.log(`[MyAgent] Server using new framework started on http://localhost:${PORT}`);
  console.log(`[MyAgent] Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
  console.log("[MyAgent] Press Ctrl+C to stop the server");
});
