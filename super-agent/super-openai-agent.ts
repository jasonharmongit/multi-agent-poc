import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import fetch from "node-fetch";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const streamTaskPath = join(__dirname, "stream-task.js");

const ResponseFormat = z.object({
  status: z.enum(["inputRequired", "completed", "error"]).default("inputRequired"),
  message: z.string(),
});

// Direct tool: get_agent_info
const getAgentInfoTool = tool(
  async () => {
    const crmAgentUrl = `http://localhost:${process.env.CRM_AGENT_PORT}/agent-card`;
    const searchAgentUrl = `http://localhost:${process.env.SEARCH_AGENT_PORT}/agent-card`;
    const [crmRes, searchRes] = await Promise.all([fetch(crmAgentUrl), fetch(searchAgentUrl)]);
    const [crmCard, searchCard] = await Promise.all([crmRes.json(), searchRes.json()]);
    return JSON.stringify([
      { agent: "CRM Agent", card: crmCard },
      { agent: "Search Agent", card: searchCard },
    ]);
  },
  {
    name: "get_agent_info",
    description:
      "Get information for the agents you have access to. No input is needed. Returns a list of agents you have access to and their capabilities.",
    schema: z.object({}),
  }
);

// Direct tool: stream_agent_task
const streamAgentTaskTool = tool(
  async ({ agentName, taskMessage }: { agentName: string; taskMessage: string }) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [streamTaskPath, agentName, taskMessage], {
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
        resolve(output);
      });
      proc.on("error", (err) => {
        reject(err);
      });
    });
  },
  {
    name: "stream_agent_task",
    description:
      "Stream a task to an agent. Input: agentName (e.g., 'CRM Agent' or 'Research Agent') and taskMessage (a directive for the agent to follow). Example: {agentName: 'CRM Agent', taskMessage: 'Pull CRM History for John Doe'} Streams the agent's response.",
    schema: z.object({
      agentName: z.string().describe("The name of the agent to send the message to."),
      taskMessage: z.string().describe("The message to send to the agent."),
    }),
  }
);

export class SuperOpenAIAgent {
  private tools: any[];
  private model: ChatOpenAI;
  private agent: any; // AgentExecutor instance

  private constructor(tools: any[], model: ChatOpenAI, agent: any) {
    this.tools = tools;
    this.model = model;
    this.agent = agent;
  }

  static async create(): Promise<SuperOpenAIAgent> {
    const tools = [getAgentInfoTool, streamAgentTaskTool];
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
    return new SuperOpenAIAgent(tools, llm, agentExecutor);
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

  // async close() {
  //   console.log("Closing MCP client");
  //   await this.mcpClient.close();
  // }

  static SUPPORTED_CONTENT_TYPES = ["text", "text/plain"];
}

// // Helper to fetch MCP tools and keep the client open
// export async function fetchMcpTools(): Promise<{ tools: any[]; mcpClient: Client }> {
//   const mcpClient = new Client({ name: "crm-mcp-client", version: "1.0.0" });
//   const transport = new StreamableHTTPClientTransport(
//     new URL(`http://localhost:${process.env.SUPER_MCP_SERVER_PORT}/mcp`)
//   );
//   await mcpClient.connect(transport);
//   const tools = await loadMcpTools("SuperAgentMCPServer", mcpClient);
//   // Do NOT close mcpClient here!
//   return { tools, mcpClient };
// }
