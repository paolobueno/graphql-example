#!/usr/bin/env node
'use strict';

const {ApolloServer, gql} = require('apollo-server');
const {decorateLeaves, runFakeQuery, fakeDataLoader} = require('./utils');
const {debugResolver} = require('./debug');
const {propEq, prop, pipe, then, pick} = require('ramda');
const {people, systems, projects} = require('./fixtures');

const db = require('knex')({
  client: 'mssql',
});

class SystemRepository {
  constructor() {
    this.loader = fakeDataLoader('id', () => db.select('*').from('Systems'));
  }
  getAll() {
    const query = db.select('*').from('Systems');
    return runFakeQuery(query, systems);
  }
  async getSingle(id) {
    await this.loader.load(id);
    return systems.find(({id: systemId}) => systemId === id);
  }
}

class ProjectRepository {
  constructor() {
    this.bySystemLoader = fakeDataLoader('systemId', () =>
      db.select('*').from('Project'),
    );
  }
  async getSingleBySystem(id) {
    await this.bySystemLoader.load(id);
    return projects.find(propEq('systemId', id));
  }
}

class ClientRepository {
  constructor() {
    this.loader = fakeDataLoader('projectId', () =>
      db.select('*').from('Clients'),
    );
    this.profileLoader = fakeDataLoader(
      'id',
      () => db.select('*').from('Profiles'),
      6,
    );
  }
  async getByProject(id) {
    const clients = people
      .filter(propEq('projectId', id))
      .map(pick(['id', 'company']));
    await this.loader.load(id);
    return clients;
  }
  async getProfileSingle(id) {
    await this.profileLoader.load(id);
    return pick(['id', 'name', 'email'])(people.find(propEq('id', id)));
  }
}

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

const fetchSystemOrUseParent = async (system, _, {dataSources: {systems}}) => {
  if (system.type) {
    return system;
  }
  return systems.getSingle(system.id);
};

const fetchProject = async ({systemId}, _, {dataSources: {projects}}) =>
  projects.getSingleBySystem(systemId);

const fetchProfile = async ({id}, _, {dataSources: {clients}}) =>
  clients.getProfileSingle(id);

// prettier-ignore
const resolvers = {
  Query: {
    systems: (_, _params, {dataSources: {systems}}) => systems.getAll(),
    system: (_, {id}) => ({id}),
  },
  System: {
    type: pipe(fetchSystemOrUseParent, then(prop('type'))),
    project: ({id}) => ({systemId: id}),
  },
  Project: {
    id: pipe(fetchProject, then(prop('id'))),
    vessel: pipe(fetchProject,then(prop('vessel'))),
    clients: async ({systemId}, _, {dataSources: {clients, projects}}) => {
      const p = await projects.getSingleBySystem(systemId);
      return clients.getByProject(p.id);
    },
  },
  Client: {
    name: pipe(fetchProfile, then(prop('name'))),
    email: pipe(fetchProfile, then(prop('email'))),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers: decorateLeaves(debugResolver)(resolvers),
  dataSources: () => ({
    systems: new SystemRepository(),
    projects: new ProjectRepository(),
    clients: new ClientRepository(),
  }),
});

server.listen(4000).then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
