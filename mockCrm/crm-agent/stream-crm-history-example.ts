import { A2AClient, MessageSendParams, Part, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from "@a2a-js/sdk";
// If you get a type error for uuid, run: pnpm add -D @types/uuid
import { v4 as uuidv4 } from "uuid";

// Point this to your running CRM agent
const client = new A2AClient("http://localhost:8000");

function getTextFromPart(part: Part | undefined): string {
  // Only return .text if this is a text part
  if (part && "text" in part && typeof (part as any).text === "string") {
    return (part as any).text;
  }
  return "";
}

async function streamCrmHistory() {
  const messageId = uuidv4();
  try {
    console.log(`\n--- Starting streaming CRM history task for message ${messageId} ---`);

    // Construct the MessageSendParams object
    const streamParams: MessageSendParams = {
      message: {
        messageId: messageId,
        role: "user",
        parts: [{ kind: "text", text: "Show me the CRM history for John Doe." }],
        kind: "message",
      },
    };

    // Use the sendMessageStream method
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
        const text = getTextFromPart(statusEvent.status.message?.parts[0]);
        console.log(`[${statusEvent.taskId}] Status Update: ${statusEvent.status.state} - ${text}`);
        if (statusEvent.final) {
          console.log(`[${statusEvent.taskId}] Stream marked as final.`);
          break; // Exit loop when server signals completion
        }
      } else if ((event as TaskArtifactUpdateEvent).kind === "artifact-update") {
        const artifactEvent = event as TaskArtifactUpdateEvent;
        // Use artifact.name or artifact.artifactId for identification
        console.log(
          `[${artifactEvent.taskId}] Artifact Update: ` +
            `${artifactEvent.artifact.name ?? artifactEvent.artifact.artifactId} - ` +
            `Part Count: ${artifactEvent.artifact.parts.length}`
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

streamCrmHistory();
