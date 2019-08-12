#!/usr/bin/env node
'use strict';

const {ApolloServer, gql} = require('apollo-server');
const {decorateLeaves, runFakeQuery} = require('./utils');
const {debugResolver} = require('./debug');
const {propEq} = require('ramda');
const {people, systems, projects} = require('./fixtures');

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

const ProjectRepository = {
  getSingleBySystem: id => {
    const query = db
      .select('*')
      .from('Project')
      .where('systemId', id);
    return runFakeQuery(query, projects.find(propEq('systemId', id)));
  },
};

const ClientRepository = {
  getByProject: async id => {
    const query = db
      .select('*')
      .from('Clients')
      .where('projectId', id);

    const res = await runFakeQuery(
      query,
      people.filter(propEq('projectId', id)),
    );

    const pQuery = id =>
      db
        .select('*')
        .from('Profiles')
        .where('id', id);
    await Promise.all(res.map(p => runFakeQuery(pQuery(p.id), null, 6)));

    return res;
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
    project: Project!
  }

  type Project {
    id: ID!
    vessel: String!
    clients: [Client!]!
  }

  type Client {
    id: ID!
    company: String!
    name: String!
    email: String!
  }
`;

const resolvers = {
  Query: {
    systems: () => SystemRepository.getAll(),
    system: (_, {id}) => SystemRepository.getSingle(id),
  },
  System: {
    project: ({id}) => ProjectRepository.getSingleBySystem(id),
  },
  Project: {
    clients: ({id}) => ClientRepository.getByProject(id),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers: decorateLeaves(debugResolver)(resolvers),
});

server.listen(4000).then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
