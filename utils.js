const debug = require('debug');
const dbL = debug('app:db');
const {default: pq} = require('p-queue');
const {mergeDeepWith} = require('ramda');
const DataLoader = require('dataloader');
const ColorHash = require('color-hash');
const chalk = require('chalk');

const colorHash = new ColorHash();

exports.decorateLeaves = fn => o => mergeDeepWith(fn, o, o);

const queue = new pq({concurrency: 2});

const wait = ms =>
  queue.add(
    () =>
      new Promise(res =>
        setTimeout(() => {
          res();
        }, ms),
      ),
  );

const TIMEOUT = 200;

const runQueryWithLogging = async (q, mult = 1) => {
  const log = chalk.hex(colorHash.hex(q.toString()));
  const start = new Date();
  dbL(`⇐ ${log(q.toString())}`);

  await wait(TIMEOUT * mult);

  const end = new Date();
  dbL(log.underline(`🢚 ${q.toString()} ${+end - start}ms`));
};

exports.runFakeQuery = async (query, ret, mult) => {
  await runQueryWithLogging(query, mult);
  return ret;
};

const doQuery = (keyField, makeQuery, mult = 1) => async keys => {
  const q = makeQuery().whereIn(keyField, keys);
  await runQueryWithLogging(q, mult);
  return keys.map(() => null);
};

const fakeDataLoader = (keyField, makeQuery, mult) =>
  new DataLoader(doQuery(keyField, makeQuery, mult));

exports.fakeDataLoader = fakeDataLoader;

class BaseRepository {
  constructor(ttl = 60 * 60) {
    this.ttl = ttl;
  }

  getCacheKey(key) {
    return this.constructor.name + '_' + String(key);
  }

  async getCacheObject(key) {
    const res = await this.cache.get(this.getCacheKey(key));
    return res ? JSON.parse(res) : undefined;
  }
  setCacheObject(key, o) {
    this.cache &&
      this.cache.set(this.getCacheKey(key), JSON.stringify(o), {ttl: this.ttl});
  }

  initialize({cache}) {
    this.cache = cache;
  }
  fakeDataLoader(keyField, makeQuery, mult = 1) {
    const run = doQuery(keyField, makeQuery, mult);
    return new DataLoader(async keys => {
      const res = keys.map(() => null);
      const cached = await Promise.all(keys.map(k => this.getCacheObject(k)));
      if (cached.every(x => x)) {
        return res;
      }
      await run(keys);
      keys.forEach(k => this.setCacheObject(k, {}));
      return res;
    });
  }
}

exports.BaseRepository = BaseRepository;
