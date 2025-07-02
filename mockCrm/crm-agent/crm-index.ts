import { createCrmAgentApp } from "./crm-a2a-agent.js";

const { app, port } = createCrmAgentApp();

app.listen(port, () => {
  console.log(`CRM Agent running on http://localhost:${port}`);
});
