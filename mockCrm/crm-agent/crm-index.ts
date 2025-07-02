import { createCrmAgentApp } from "./crm-a2a-agent.js";

(async () => {
  const { app, port } = await createCrmAgentApp();
  app.listen(port, () => {
    console.log(`[CRM Agent] Server using new framework started on http://localhost:${port}`);
    console.log(`[CRM Agent] Agent Card: http://localhost:${port}/.well-known/agent.json`);
    console.log("[CRM Agent] Press Ctrl+C to stop the server");
  });
})();
