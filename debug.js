const debug = require('debug');

const resL = debug('app:resolver');

const flattenPath = path => {
  const prevs = [path.key];
  let prev = path.prev;

  while (prev) {
    prevs.unshift(prev.key);
    prev = prev.prev;
  }
  return prevs;
};

exports.debugResolver = function(fn) {
  return async function(_parent, args, _context, {path}) {
    resL('resolver:', flattenPath(path).join('/'), args);
    return await fn.apply(null, arguments);
  };
};