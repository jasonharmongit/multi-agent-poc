import { A2AExpressApp, AgentExecutor, DefaultRequestHandler, InMemoryTaskStore, TaskStore } from "@a2a-js/sdk";
import express from "express";
import SuperAgentExecutor, { superAgentCard } from "./super-a2a-agent.js";

const taskStore: TaskStore = new InMemoryTaskStore();
const agentExecutor: AgentExecutor = await SuperAgentExecutor.create();

const requestHandler = new DefaultRequestHandler(superAgentCard(), taskStore, agentExecutor);

const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express(), "");

const PORT = process.env.SUPER_AGENT_PORT; // Different port for search agent
expressApp.listen(PORT, () => {
  console.log(`[Super Agent] Server using new framework started on http://localhost:${PORT}`);
  console.log(`[Super Agent] Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
  console.log("[Super Agent] Press Ctrl+C to stop the server");
});
