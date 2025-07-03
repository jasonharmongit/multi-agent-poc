import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import dotenv from "dotenv";
import Fuse from "fuse.js";
import { activities, companies, contacts } from "./mockCrmDb.js";
import { typeDefs } from "./schema.js";
dotenv.config();

const fuse = new Fuse(contacts, {
  keys: ["first_name", "last_name", "email"],
  threshold: 0.3,
});

const resolvers = {
  Query: {
    companies: () => companies,
    company: (_: any, { id }: { id: number }) => companies.find((c) => c.id === id),
    contacts: () => contacts,
    contact: (_: any, { id }: { id: number }) => contacts.find((c) => c.id === id),
    activities: () => activities,
    activity: (_: any, { id }: { id: number }) => activities.find((a) => a.id === id),
    searchContactsByFields: (_: any, args: { first_name?: string; last_name?: string; email?: string }) => {
      let results = contacts;
      if (args.first_name) {
        const fuse = new Fuse(results, { keys: ["first_name"], threshold: 0.3 });
        results = fuse.search(args.first_name).map((r) => r.item);
      }
      if (args.last_name) {
        const fuse = new Fuse(results, { keys: ["last_name"], threshold: 0.3 });
        results = fuse.search(args.last_name).map((r) => r.item);
      }
      if (args.email) {
        const fuse = new Fuse(results, { keys: ["email"], threshold: 0.3 });
        results = fuse.search(args.email).map((r) => r.item);
      }
      return results;
    },
  },
  Company: {
    contacts: (parent: any) => contacts.filter((c) => c.company_id === parent.id),
  },
  Contact: {
    company: (parent: any) => companies.find((c) => c.id === parent.company_id),
    activities: (parent: any) => activities.filter((a) => a.contact_id === parent.id),
  },
  Activity: {
    contact: (parent: any) => contacts.find((c) => c.id === parent.contact_id),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const start = async () => {
  const { url } = await startStandaloneServer(server, { listen: { port: Number(process.env.CRM_MOCK_DB_PORT) } });
  console.log(`🚀 Server ready at ${url}`);
};

start();
