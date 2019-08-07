#!/usr/bin/env node
'use strict';

const {ApolloServer, gql} = require('apollo-server');
const {mergeDeepWith} = require('ramda');

const decorateLeaves = fn => o => mergeDeepWith(fn, o, o);

const debug = require('debug');
const dbL = debug('app:db');
const resL = debug('app:resolver');

const db = require('knex')({
  client: 'mssql',
});

const systems = [
  {
    id: 1,
    type: 'A',
  },
  {
    id: 2,
    type: 'B',
  },
];

const operators = [
  {
    id: 1,
    name: 'Rosalyn Koelpin',
    systemId: 1,
  },
  {
    id: 2,
    name: 'Ole Weissnat',
    systemId: 1,
  },
  {
    id: 3,
    name: 'Anne Dijk',
    systemId: 1,
  },
  {
    id: 4,
    name: 'Fleur Dijkstra',
    systemId: 2,
  },
  {
    id: 5,
    name: 'Julia Jacobs',
    systemId: 2,
  },
];

const wait = ms =>
  new Promise(res =>
    setTimeout(() => {
      res();
    }, ms),
  );

const TIMEOUT = 200;

const runFakeQuery = async (query, ret) => {
  await wait(TIMEOUT);
  dbL(query.toString());
  return ret;
};

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
    return runFakeQuery(query, operators.filter(({systemId}) => systemId === id));
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

const flattenPath = path => {
  const prevs = [path.key];
  let prev = path.prev;

  while (prev) {
    prevs.unshift(prev.key);
    prev = prev.prev;
  }
  return prevs;
};

const debugResolver = function(fn) {
  return async function(_parent, args, _context, {path}) {
    resL('resolver:', flattenPath(path).join('/'), args);
    return await fn.apply(null, arguments);
  };
};

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
