#!/usr/bin/env node
'use strict';

const {ApolloServer, gql} = require('apollo-server');
const {decorateLeaves, runFakeQuery} = require('./utils');
const {debugResolver} = require('./debug');
const {operators, systems} = require('./fixtures');

const db = require('knex')({
  client: 'mssql',
});

const SystemRepository = {
  getAll: () => {
    const query = db.select('*').from('Systems');
    return runFakeQuery(query, systems);
  },
  getSingle: id => {
    const query = db
      .select('*')
      .from('Systems')
      .where('id', id);
    return runFakeQuery(
      query,
      systems.find(({id: systemId}) => systemId === id),
    );
  },
};

const OperatorRepository = {
  getBySystem: id => {
    const query = db
      .select('*')
      .from('Operators')
      .where('systemId', id);
    return runFakeQuery(
      query,
      operators.filter(({systemId}) => systemId === id),
    );
  },
};

const PersonRepository = {
  getSingle: id => {
    const query = db
      .select('*')
      .from('Profiles')
      .where('id', id);
    return runFakeQuery(query, '0620620601');
  },
};

const typeDefs = gql`
  type Query {
    system(id: Int!): System
    systems: [System!]
  }

  type System {
    id: ID!
    type: String!
    # ...
    operators: [Operator!]
  }

  type Operator {
    id: ID!
    name: String
    phone: String
  }
`;

const resolvers = {
  Query: {
    systems: () => SystemRepository.getAll(),
    system: (_, {id}) => SystemRepository.getSingle(id),
  },
  System: {
    operators: ({id}) => OperatorRepository.getBySystem(id),
  },
  Operator: {
    phone: ({id}) => PersonRepository.getSingle(id),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers: decorateLeaves(debugResolver)(resolvers),
});

server.listen(4000).then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
