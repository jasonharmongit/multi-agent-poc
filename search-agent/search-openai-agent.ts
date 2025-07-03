import { ChatPromptTemplate } from "@langchain/core/prompts";
import { loadMcpTools } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from "dotenv";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ResponseFormat = z.object({
  status: z.enum(["inputRequired", "completed", "error"]).default("inputRequired"),
  message: z.string(),
});

export class SearchOpenAIAgent {
  private tools: any[];
  private model: ChatOpenAI;
  private agent: any; // AgentExecutor instance
  private mcpClient: Client;

  private constructor(tools: any[], model: ChatOpenAI, agent: any, mcpClient: Client) {
    this.tools = tools;
    this.model = model;
    this.agent = agent;
    this.mcpClient = mcpClient;
  }

  static async create(): Promise<SearchOpenAIAgent> {
    const { tools, mcpClient } = await fetchMcpTools();
    const llm = new ChatOpenAI({
      modelName: "gpt-4.1-mini-2025-04-14",
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    // Use the default OpenAI tools agent prompt from the hub
    const prompt = (await pull("hwchase17/openai-tools-agent")) as ChatPromptTemplate;
    const agent = await createOpenAIToolsAgent({
      llm,
      tools,
      prompt,
    });
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
    });
    return new SearchOpenAIAgent(tools, llm, agentExecutor, mcpClient);
  }

  async invoke(query: string, sessionId: string) {
    if (!query) throw new Error("Query must not be empty");
    if (!sessionId) throw new Error("Session ID must not be empty");
    const config = { configurable: { thread_id: sessionId } };
    try {
      const result = await this.agent.invoke({ input: query }, config);
      return result;
    } catch (err) {
      console.error("Agent invocation error:", err);
      throw err;
    }
  }

  async *stream(query: string, sessionId: string) {
    const config = { configurable: { thread_id: sessionId } };
    for await (const item of this.agent.stream({ input: query }, config, { streamMode: "values" })) {
      yield item;
    }
    // Optionally, yield the final result again if needed
    // const result = await this.agent.invoke({ input: query }, config);
    // yield result;
  }

  async close() {
    console.log("Closing MCP client");
    await this.mcpClient.close();
  }

  static SUPPORTED_CONTENT_TYPES = ["text", "text/plain"];
}

// Helper to fetch MCP tools and keep the client open
export async function fetchMcpTools(): Promise<{ tools: any[]; mcpClient: Client }> {
  const mcpClient = new Client({ name: "crm-mcp-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://localhost:${process.env.SEARCH_MCP_SERVER_PORT}/mcp`)
  );
  await mcpClient.connect(transport);
  const tools = await loadMcpTools("SearchAgentMCPServer", mcpClient);
  // Do NOT close mcpClient here!
  return { tools, mcpClient };
}
