import { PromptTemplate } from "@langchain/core/prompts";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import { createReactAgent } from "langchain/agents";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SYSTEM_INSTRUCTION = `
You are a specialized assistant for CRM queries.
Your sole purpose is to use the available CRM tools to answer questions about CRM history and contacts.
If the user asks about anything else, politely state that you cannot help with that topic.

TOOLS:
{tools}

TOOL NAMES:
{tool_names}

AGENT SCRATCHPAD:
{agent_scratchpad}

Set response status to inputRequired if the user needs to provide more information.
Set response status to error if there is an error while processing the request.
Set response status to completed if the request is complete.
`;

const ResponseFormat = z.object({
  status: z.enum(["inputRequired", "completed", "error"]).default("inputRequired"),
  message: z.string(),
});

export class CrmOpenAIAgent {
  private tools: any[];
  private model: ChatOpenAI;
  private agent: any; // LangChain agent instance

  private constructor(tools: any[], model: ChatOpenAI, agent: any) {
    this.tools = tools;
    this.model = model;
    this.agent = agent;
  }

  static async create(tools: any[]): Promise<CrmOpenAIAgent> {
    const model = new ChatOpenAI({
      modelName: "gpt-4.1-mini-2025-04-14",
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    const agent = await createReactAgent({
      llm: model,
      tools: tools,
      prompt: PromptTemplate.fromTemplate(SYSTEM_INSTRUCTION),
    });
    return new CrmOpenAIAgent(tools, model, agent);
  }

  async invoke(query: string, sessionId: string) {
    const config = { configurable: { thread_id: sessionId } };
    await this.agent.invoke({ messages: [{ role: "user", content: query }] }, config);
    return this.getAgentResponse(config);
  }

  async *stream(query: string, sessionId: string) {
    const inputs = { messages: [{ role: "user", content: query }] };
    const config = { configurable: { thread_id: sessionId } };
    for await (const item of this.agent.stream(inputs, config, { streamMode: "values" })) {
      const message = item.messages[item.messages.length - 1];
      yield {
        is_task_complete: false,
        require_user_input: false,
        content: "Processing...",
      };
    }
    yield this.getAgentResponse(config);
  }

  private getAgentResponse(config: any) {
    const currentState = this.agent.getState(config);
    const structuredResponse = currentState.values?.structured_response;
    if (structuredResponse && ResponseFormat.safeParse(structuredResponse).success) {
      if (structuredResponse.status === "inputRequired") {
        return {
          is_task_complete: false,
          require_user_input: true,
          content: structuredResponse.message,
        };
      } else if (structuredResponse.status === "error") {
        return {
          is_task_complete: false,
          require_user_input: true,
          content: structuredResponse.message,
        };
      } else if (structuredResponse.status === "completed") {
        return {
          is_task_complete: true,
          require_user_input: false,
          content: structuredResponse.message,
        };
      }
    }
    return {
      is_task_complete: false,
      require_user_input: true,
      content: "We are unable to process your request at the moment. Please try again.",
    };
  }

  static SUPPORTED_CONTENT_TYPES = ["text", "text/plain"];
}

// Helper to fetch MCP tools
export async function fetchMcpTools(): Promise<any[]> {
  const mcpClient = new Client({ name: "crm-mcp-client", version: "1.0.0" });
  // Use Node.js to spawn the MCP server as a subprocess via stdio
  // Adjust the path to crm-mcp.js as needed for your project structure
  const transport = new StdioClientTransport({
    command: process.execPath, // Node.js executable
    args: [join(__dirname, "crm-mcp.js")], // Path to the MCP server file
  });
  await mcpClient.connect(transport);
  const tools = await loadMcpTools("MinimalCrmServer", mcpClient);
  await mcpClient.close();
  return tools;
}
