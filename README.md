# System Architecture

3 agents: Super, Search, and CRM

### Each agent is composed of:

- a2a agentic wrapper (with card)
- LangChain ReAct agent, powered by OpenAI API
- MCP suite of tools (except the supervisor, which gets tools directly)

### Network Setup:

- Each MCP suite runs on its own server
- Each a2a agent runs on its own server
- (The mock CRM graphql API runs on its own server)

### Agent Tools:

- Super Agent: `get_agent_info`, `stream_agent_task`
- CRM Agent: `get_crm_history`
- Search Agent: `search_internet`

# Running Instructions:

From within the repo (`cd multi-agent-pod`)...

1. Install dependencies: `pnpm install`
2. Compile typescript: `pnpm build`
3. Start all MCP & Agent Servers (each in a terminal window): `./start-all`
4. Send messages & stream outputs: `pnpm super-stream`

# Sample Outputs:

- CRM Agent:

```
pnpm crm-stream

> multi-agent-poc@1.0.0 crm-stream /Users/jasonharmon/projects/multi-agent-poc
> node dist/mockCrm/crm-agent/crm-agent-stream.js


--- Starting streaming task for message 59f038ea-b7b4-4916-b423-35feff17eb59 ---
ENDOPINT http://localhost:3001/
[f123177f-3dea-477b-a76a-370611b6d8dd] Task created. Status: submitted
[f123177f-3dea-477b-a76a-370611b6d8dd] Status Update: working - Querying Mock Hubspot CRM...
[f123177f-3dea-477b-a76a-370611b6d8dd] Artifact Update: crm-agent-result: The CRM history for John Doe shows that there was an introductory call with him on June 1, 2024. His last activity date recorded is also June 1, 2024. If you need more details or activities, please let me know!
[f123177f-3dea-477b-a76a-370611b6d8dd] Status Update: completed - Task f123177f-3dea-477b-a76a-370611b6d8dd completed.
[f123177f-3dea-477b-a76a-370611b6d8dd] Stream marked as final.
--- Streaming for message 59f038ea-b7b4-4916-b423-35feff17eb59 finished ---
```

- Search Agent:

```
pnpm search-stream

> multi-agent-poc@1.0.0 search-stream /Users/jasonharmon/projects/multi-agent-poc
> node dist/search-agent/search-agent-stream.js

[dotenv@17.0.1] injecting env (8) from .env – [tip] encrypt with dotenvx: https://dotenvx.com

--- Starting streaming task for message f95a5b10-cdf3-4739-b085-008333a401f0 ---
ENDOPINT http://localhost:4000/
[8b4db707-3a07-4e6f-a646-883ca718229d] Task created. Status: submitted
[8b4db707-3a07-4e6f-a646-883ca718229d] Status Update: working - Searching the internet...
[8b4db707-3a07-4e6f-a646-883ca718229d] Artifact Update: search-agent-result: Here are some recent news about Acme Inc.:

1. Acme Inc. launched a new eco-friendly product line aimed at reducing environmental impact. (June 10, 2024)
2. Acme Inc. has partnered with Example Corp for a strategic global expansion. (June 5, 2024)
3. Acme Inc. reported record profits for the second quarter of 2024, exceeding analyst expectations. (June 1, 2024)

If you need more detailed information about any of these news, please let me know!
[8b4db707-3a07-4e6f-a646-883ca718229d] Status Update: completed - Task 8b4db707-3a07-4e6f-a646-883ca718229d completed.
[8b4db707-3a07-4e6f-a646-883ca718229d] Stream marked as final.
--- Streaming for message f95a5b10-cdf3-4739-b085-008333a401f0 finished ---
```

- Super Agent:

```
--- Starting streaming task for message 63e41cd4-eeb9-4a6b-bcc4-e29bcc54984b ---
[98d0e74b-9252-4894-9fb9-b55b66210066] Task created. Status: submitted
[98d0e74b-9252-4894-9fb9-b55b66210066] Status Update: working - Delegating tasks...
[98d0e74b-9252-4894-9fb9-b55b66210066] Artifact Update: super-agent-result: Here is the recent news about Acme Inc. that I found:
1. Acme Inc. has launched a new eco-friendly product line to reduce environmental impact. (June 10, 2024)
2. Acme Inc. partnered with Example Corp for global expansion. (June 5, 2024)
3. Acme Inc. reported record profits for the second quarter of 2024, exceeding analyst expectations. (June 1, 2024)

And here is the CRM history for John Doe:
- Last Activity: June 1, 2024
- Email: john.doe@acme.com
- Activity: On June 1, 2024, there was an introductory call with John Doe.

If you need more details or want to take any action, please let me know!
[98d0e74b-9252-4894-9fb9-b55b66210066] Status Update: completed - Task 98d0e74b-9252-4894-9fb9-b55b66210066 completed.
[98d0e74b-9252-4894-9fb9-b55b66210066] Stream marked as final.
--- Streaming for message 63e41cd4-eeb9-4a6b-bcc4-e29bcc54984b finished ---
```

# Improvements:

- Refactor code to eliminate duplication and to make more extensible and scalable
- Prompt customization to ensure consistent results
- Loops & memory for extended/chat interactions
- MCP instead of direct tools for supervisor agent
- Stream LLM 'thoughts' from each LLM to the user, for visibility
