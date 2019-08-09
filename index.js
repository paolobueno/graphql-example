#!/usr/bin/env node
'use strict';

const {ApolloServer, gql} = require('apollo-server');
const {decorateLeaves, runFakeQuery, fakeDataLoader} = require('./utils');
const {debugResolver} = require('./debug');
const {propEq} = require('ramda');
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
      db
        .select('*')
        .from('Clients')
        .leftJoin('Profiles', 'Clients.personId', 'Profiles.id'),
    );

    this.profileLoader = fakeDataLoader(
      'id',
      () => db.select('*').from('Profiles'),
      6,
    );
  }
  async getByProject(id) {
    const clients = people.filter(propEq('projectId', id));
    await this.loader.load(id);
    await this.profileLoader.loadMany(clients.map(p => p.id));
    return clients;
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

const resolvers = {
  Query: {
    systems: (_, _params, {dataSources: {systems}}) => systems.getAll(),
    system: (_, {id}, {dataSources: {systems}}) => systems.getSingle(id),
  },
  System: {
    project: ({id}, _, {dataSources: {projects}}) =>
      projects.getSingleBySystem(id),
  },
  Project: {
    clients: ({id}, _, {dataSources: {clients}}) => clients.getByProject(id),
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
