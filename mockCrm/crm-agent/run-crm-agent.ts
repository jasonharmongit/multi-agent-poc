import {
  A2AClient,
  GetTaskResponse,
  GetTaskSuccessResponse,
  Message,
  MessageSendParams,
  SendMessageResponse,
  SendMessageSuccessResponse,
  Task,
  TaskQueryParams,
} from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

const client = new A2AClient("http://localhost:8000"); // Replace with your server URL

async function run() {
  const messageId = uuidv4();
  let taskId: string | undefined;

  try {
    // 1. Send a message to the agent.
    const sendParams: MessageSendParams = {
      message: {
        messageId: messageId,
        role: "user",
        parts: [{ kind: "text", text: "Show me the CRM history for John Doe." }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    };

    const sendResponse: SendMessageResponse = await client.sendMessage(sendParams);

    // On success, the result can be a Task or a Message. Check which one it is.
    const result = (sendResponse as SendMessageSuccessResponse).result;

    if (result.kind === "task") {
      // The agent created a task.
      const taskResult = result as Task;
      console.log("Send Message Result (Task):", taskResult);
      taskId = taskResult.id; // Save the task ID for the next call
    } else if (result.kind === "message") {
      // The agent responded with a direct message.
      const messageResult = result as Message;
      console.log("Send Message Result (Direct Message):", messageResult);
      // No task was created, so we can't get task status.
    }

    // 2. If a task was created, get its status.
    if (taskId) {
      const getParams: TaskQueryParams = { id: taskId };
      const getResponse: GetTaskResponse = await client.getTask(getParams);

      const getTaskResult = (getResponse as GetTaskSuccessResponse).result;
      console.log("Get Task Result:", getTaskResult);

      if (
        getTaskResult.artifacts &&
        getTaskResult.artifacts.length > 0 &&
        getTaskResult.artifacts[0].parts &&
        getTaskResult.artifacts[0].parts.length > 0
      ) {
        const artifactPart = getTaskResult.artifacts[0].parts[0];
        if (artifactPart.kind === "text") {
          console.log("Agent Artifact Response:", artifactPart.text);
        }
      }

      if (
        getTaskResult.status &&
        getTaskResult.status.message &&
        getTaskResult.status.message.parts &&
        getTaskResult.status.message.parts.length > 0
      ) {
        const statusPart = getTaskResult.status.message.parts[0];
        if (statusPart.kind === "text") {
          console.log("Agent Status Message Response:", statusPart.text);
        }
      }
    }
  } catch (error) {
    console.error("A2A Client Communication Error:", error);
  }
}

run();
