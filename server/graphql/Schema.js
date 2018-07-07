const schema = `
  type ContestUser {
    id: String
    name: String
  }

  type Query {
    user(id: String): User
  }
`;

