import {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { CrmOpenAIAgent } from "./crm-openai-agent.js";

dotenv.config();

const PORT = Number(process.env.CRM_AGENT_PORT) || 8000;
const HOST = process.env.CRM_AGENT_HOST || "localhost";

// Define the agent card (metadata)
export const crmAgentCard = () => ({
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

class CrmAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();
  private crmOpenAIAgent: CrmOpenAIAgent;

  private constructor(crmOpenAIAgent: CrmOpenAIAgent) {
    this.crmOpenAIAgent = crmOpenAIAgent;
  }

  static async create(): Promise<CrmAgentExecutor> {
    const crmOpenAIAgent = await CrmOpenAIAgent.create();
    return new CrmAgentExecutor(crmOpenAIAgent);
  }

  public cancelTask = async (taskId: string, eventBus: ExecutionEventBus): Promise<void> => {
    this.cancelledTasks.add(taskId);
    // The execute loop is responsible for publishing the final state
  };

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const userMessage = requestContext.userMessage;
    let userMessageText: string;
    if (userMessage.parts?.[0]?.kind === "text") {
      userMessageText = userMessage.parts?.[0]?.text;
    } else {
      throw new Error("User message must be a text part");
    }
    if (userMessageText === "" || userMessageText === undefined) {
      throw new Error("User message must not be empty");
    }
    const existingTask = requestContext.task;

    // Determine IDs for the task and context, from requestContext.
    const taskId = requestContext.taskId;
    const contextId = requestContext.contextId;

    console.log(
      `[MyAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
    );

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: "task",
        id: taskId,
        contextId: contextId,
        status: {
          state: "submitted",
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: [], // Initialize artifacts array
      };
      eventBus.publish(initialTask);
    }

    // 2. Publish "working" status update
    const workingStatusUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: taskId,
      contextId: contextId,
      status: {
        state: "working",
        message: {
          kind: "message",
          role: "agent",
          messageId: uuidv4(),
          parts: [{ kind: "text", text: "Querying Mock Hubspot CRM..." }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    // Call the OpenAI agent with the user's message
    const result = await this.crmOpenAIAgent.invoke(userMessageText, taskId);
    const resultText = result.output;

    // Check for request cancellation
    if (this.cancelledTasks.has(taskId)) {
      console.log(`[MyAgentExecutor] Request cancelled for task: ${taskId}`);
      const cancelledUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: taskId,
        contextId: contextId,
        status: {
          state: "canceled",
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(cancelledUpdate);
      eventBus.finished();
      return;
    }

    // 3. Publish artifact update
    const artifactUpdate: TaskArtifactUpdateEvent = {
      kind: "artifact-update",
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: taskId,
        name: "crm-agent-result",
        parts: [{ kind: "text", text: resultText || "No result" }],
      },
      append: false, // Each emission is a complete file snapshot
      lastChunk: true, // True for this file artifact
    };
    eventBus.publish(artifactUpdate);

    // 4. Publish final status update
    const finalUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId: taskId,
      contextId: contextId,
      status: {
        state: "completed",
        message: {
          kind: "message",
          role: "agent",
          messageId: uuidv4(),
          taskId: taskId,
          contextId: contextId,
          parts: [{ kind: "text", text: `Task ${taskId} completed.` }],
        },
        timestamp: new Date().toISOString(),
      },
      final: true,
    };
    eventBus.publish(finalUpdate);
    eventBus.finished();
  }
}

export default CrmAgentExecutor;
