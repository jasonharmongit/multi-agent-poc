## CRM A2A Agent: Execution Flow & Architecture

This document describes the flow and architecture of the CRM A2A agent implementation.

---

### 1. Entry Point: `crm-index.ts`

- The file is executed.
- The top-level async IIFE runs.
- It calls and awaits `createCrmAgentApp()`.

---

### 2. `createCrmAgentApp` in `crm-a2a-agent.ts`

- Checks for the `OPENAI_API_KEY` environment variable.
- Calls `fetchMcpTools()` to get the MCP tools (see below).
- Instantiates `CrmOpenAIAgent` with those tools.
- Prepares the agent card (metadata).
- Sets up an in-memory task store.
- Wraps the agent in a `CrmAgentExecutor` (see below).
- Creates a `DefaultRequestHandler` with the card, store, and executor.
- Uses `A2AExpressApp` to set up all required A2A protocol routes on a new Express app.
- Returns `{ app, port }`.

---

### 3. `fetchMcpTools` in `crm-openai-agent.ts`

- Spawns the MCP server (`crm-mcp.js`) as a subprocess.
- Connects to it via stdio.
- Loads the available tools from the MCP server.
- Returns the tools array.

---

### 4. `CrmOpenAIAgent` in `crm-openai-agent.ts`

- Receives the MCP tools.
- Sets up an LLM agent (OpenAI) with those tools and a system prompt.
- Provides an `invoke` method to process CRM queries using the tools.

---

### 5. `CrmAgentExecutor` in `crm-a2a-agent.ts`

- Wraps the `CrmOpenAIAgent`.
- Implements the `execute` method required by the A2A protocol.
- When a task is received, it calls the agent's `invoke` method and attaches the result to the task.

---

### 6. A2A Protocol Server

- The `A2AExpressApp` and `DefaultRequestHandler` set up all required endpoints:
  - `/.well-known/agent.json` (agent card/metadata)
  - `/tasks` and related endpoints for task creation, status, etc.
- The Express app is started and listens on the specified port.

---

### 7. What happens at runtime?

- The server is running and ready to accept A2A protocol requests.
- If a client requests the agent card (`GET /.well-known/agent.json`), it gets the metadata.
- If a client submits a task (e.g., to fetch CRM history), the request is routed to the executor, which calls your LLM agent, which in turn uses the MCP tools (via the subprocess) to fetch or simulate CRM data, and returns the result.

---
