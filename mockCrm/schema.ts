export const typeDefs = `#graphql

type Company {
  id: Int!
  name: String!
  industry: String!
  website: String!
  address: String!
  contacts: [Contact!]!
}

type Contact {
  id: Int!
  first_name: String!
  last_name: String!
  email: String!
  company: Company!
  activities: [Activity!]
}

type Activity {
  id: Int!
  type: String!
  date: String!
  description: String!
  contact: Contact!
}

type Query {
  companies: [Company!]!
  company(id: Int!): Company
  contacts: [Contact!]!
  contact(id: Int!): Contact
  activities: [Activity!]!
  activity(id: Int!): Activity
  searchContactsByFields(first_name: String, last_name: String, email: String): [Contact!]!
}
`;
