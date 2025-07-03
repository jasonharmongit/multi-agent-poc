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
import { SuperOpenAIAgent } from "./super-openai-agent.js";

dotenv.config();

const PORT = Number(process.env.SUPER_AGENT_PORT);
const HOST = "localhost";

// Define the agent card (metadata)
export const superAgentCard = () => ({
  name: "Super Agent",
  description: "Supervisor/orchestrator agent",
  url: `http://${HOST}:${PORT}/`,
  version: "1.0.0",
  defaultInputModes: ["text", "text/plain"],
  defaultOutputModes: ["text", "text/plain"],
  capabilities: {
    streaming: true,
    pushNotifications: false,
  },
  skills: [
    {
      id: "get-agent-info",
      name: "Get information for the agents you have access to",
      description: "Get information for the agents you have access to",
      tags: ["get", "agent", "info"],
      examples: ["Get information for the agents you have access to"],
    },
    {
      id: "stream-task",
      name: "Stream a task to an agent",
      description: "Stream a task to an agent",
      tags: ["stream", "task", "agent"],
      examples: ["Stream a task to an agent"],
    },
  ],
});

class SuperAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();
  private superOpenAIAgent: SuperOpenAIAgent;

  private constructor(superOpenAIAgent: SuperOpenAIAgent) {
    this.superOpenAIAgent = superOpenAIAgent;
  }

  static async create(): Promise<SuperAgentExecutor> {
    const superOpenAIAgent = await SuperOpenAIAgent.create();
    return new SuperAgentExecutor(superOpenAIAgent);
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

    console.log(`[Super Agent] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`);

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
          parts: [{ kind: "text", text: "Delegating tasks..." }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    // Call the OpenAI agent with the user's message
    const result = await this.superOpenAIAgent.invoke(userMessageText, taskId);
    const resultText = result.output;

    // Check for request cancellation
    if (this.cancelledTasks.has(taskId)) {
      console.log(`[Super Agent] Request cancelled for task: ${taskId}`);
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
        name: "super-agent-result",
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

export default SuperAgentExecutor;
