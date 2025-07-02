// Mock CRM database with snake_case fields

export const companies = [
  {
    id: 1,
    name: "Acme Corp",
    industry: "Manufacturing",
    website: "https://acme.com",
    address: "123 Main St, Springfield",
  },
  {
    id: 2,
    name: "Globex Inc",
    industry: "Technology",
    website: "https://globex.com",
    address: "456 Elm St, Metropolis",
  },
];

export const contacts = [
  {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@acme.com",
    company_id: 1,
  },
  {
    id: 2,
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@globex.com",
    company_id: 2,
  },
  {
    id: 3,
    first_name: "Alice",
    last_name: "Johnson",
    email: "alice.johnson@acme.com",
    company_id: 1,
  },
  {
    id: 4,
    first_name: "Bob",
    last_name: "Williams",
    email: "bob.williams@globex.com",
    company_id: 2,
  },
];

export const activities = [
  {
    id: 1,
    type: "call",
    date: "2024-06-01",
    description: "Introductory call with John Doe.",
    contact_id: 1,
  },
  {
    id: 2,
    type: "email",
    date: "2024-06-03",
    description: "Sent follow-up email to Jane Smith.",
    contact_id: 2,
  },
  {
    id: 3,
    type: "meeting",
    date: "2024-06-05",
    description: "Project kickoff meeting with Alice Johnson.",
    contact_id: 3,
  },
  {
    id: 4,
    type: "note",
    date: "2024-06-06",
    description: "Added note for Bob Williams.",
    contact_id: 4,
  },
  {
    id: 5,
    type: "call",
    date: "2024-06-07",
    description: "Follow-up call with Jane Smith.",
    contact_id: 2,
  },
];
