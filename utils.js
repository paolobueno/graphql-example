const debug = require('debug');
const dbL = debug('app:db');
const {mergeDeepWith} = require('ramda');

exports.decorateLeaves = fn => o => mergeDeepWith(fn, o, o);

const wait = ms =>
  new Promise(res =>
    setTimeout(() => {
      res();
    }, ms),
  );

const TIMEOUT = 200;

exports.runFakeQuery = async (query, ret) => {
  await wait(TIMEOUT);
  dbL(query.toString());
  return ret;
};
