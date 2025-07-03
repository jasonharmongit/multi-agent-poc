import { A2AClient, MessageSendParams, Task, TaskArtifactUpdateEvent, TaskStatusUpdateEvent } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

const client = new A2AClient("http://localhost:3001");

async function streamTask() {
  const messageId = uuidv4();
  try {
    console.log(`\n--- Starting streaming task for message ${messageId} ---`);

    // Construct the `MessageSendParams` object.
    const streamParams: MessageSendParams = {
      message: {
        messageId: messageId,
        role: "user",
        parts: [{ kind: "text", text: "Show me the CRM history for John Doe." }],
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

streamTask();
