import { A2AClient, MessageSendParams, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from "@a2a-js/sdk";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

// Directory of agent names to their ports (from env)
const agentDirectory: Record<string, number> = {
  "CRM Agent": Number(process.env.CRM_AGENT_PORT),
  "Research Agent": Number(process.env.SEARCH_AGENT_PORT),
};

async function streamTask(agentName: string, taskMessage: string) {
  const port = agentDirectory[agentName];
  if (!port) {
    console.error(`Unknown agent: ${agentName}`);
    return;
  }
  const client = new A2AClient(`http://localhost:${port}/`);
  const messageId = uuidv4();
  try {
    console.log(`\n--- Starting streaming task for message ${messageId} to ${agentName} ---`);

    // Construct the `MessageSendParams` object.
    const streamParams: MessageSendParams = {
      message: {
        messageId: messageId,
        role: "user",
        parts: [{ kind: "text", text: taskMessage }],
        kind: "message",
      },
    };

    // Use the `sendMessageStream` method.
    const stream = client.sendMessageStream(streamParams);
    let currentTaskId: string | undefined;

    for await (const event of stream) {
      // The first event is often the Task object itself, establishing the ID.
      if ((event as Task).kind === "task") {
        currentTaskId = (event as Task).id;
        console.log(`[${currentTaskId}] Task created. Status: ${(event as Task).status.state}`);
        continue;
      }

      // Differentiate subsequent stream events.
      if ((event as TaskStatusUpdateEvent).kind === "status-update") {
        const statusEvent = event as TaskStatusUpdateEvent;
        if (statusEvent.status.message?.parts?.[0]?.kind === "text") {
          console.log(
            `[${statusEvent.taskId}] Status Update: ${statusEvent.status.state} - ${statusEvent.status.message.parts[0].text}`
          );
        } else {
          console.log(`[${statusEvent.taskId}] Status Update: ${statusEvent.status.state}`);
        }
        if (statusEvent.final) {
          console.log(`[${statusEvent.taskId}] Stream marked as final.`);
          break; // Exit loop when server signals completion
        }
      } else if ((event as TaskArtifactUpdateEvent).kind === "artifact-update") {
        const artifactEvent = event as TaskArtifactUpdateEvent;
        const artifact = artifactEvent.artifact;
        const artifactPart = artifact.parts[0];
        // Use artifact.name or artifact.artifactId for identification
        console.log(
          `[${artifactEvent.taskId}] Artifact Update: ${artifact.name ?? artifact.artifactId}: ${
            artifactPart.kind === "text" ? artifactPart.text : "No text part"
          }`
        );
      } else {
        // This could be a direct Message response if the agent doesn't create a task.
        console.log("Received direct message response in stream:", event);
      }
    }
    console.log(`--- Streaming for message ${messageId} finished ---`);
  } catch (error) {
    console.error(`Error during streaming for message ${messageId}:`, error);
  }
}

// Accept agentName and userMessage from command line args
const [, , agentNameArg, ...userMessageParts] = process.argv;
const userMessageArg = userMessageParts.join(" ");

if (!agentNameArg || !userMessageArg) {
  console.error("Usage: ts-node stream-task.ts <Agent Name> <User Message>");
  process.exit(1);
}

streamTask(agentNameArg, userMessageArg);
