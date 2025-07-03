import { A2AExpressApp, AgentExecutor, DefaultRequestHandler, InMemoryTaskStore, TaskStore } from "@a2a-js/sdk";
import express from "express";
import SearchAgentExecutor, { searchAgentCard } from "./search-a2a-agent.js";

const taskStore: TaskStore = new InMemoryTaskStore();
const agentExecutor: AgentExecutor = await SearchAgentExecutor.create();

const requestHandler = new DefaultRequestHandler(searchAgentCard(), taskStore, agentExecutor);

const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express(), "");

const PORT = process.env.SEARCH_AGENT_PORT; // Different port for search agent
expressApp.listen(PORT, () => {
  console.log(`[Search Agent] Server using new framework started on http://localhost:${PORT}`);
  console.log(`[Search Agent] Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
  console.log("[Search Agent] Press Ctrl+C to stop the server");
});
