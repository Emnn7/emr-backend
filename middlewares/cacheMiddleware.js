const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url;
    const cachedData = cache.get(key);

    if (cachedData) {
      return res.json(cachedData);
    } else {
      const oldSend = res.send;
      res.send = function (data) {
        cache.set(key, data, duration);
        oldSend.apply(res, arguments);
      };
      next();
    }
  };
};

const clearCache = (keys) => {
  if (Array.isArray(keys)) {
    keys.forEach(key => cache.del(key));
  } else {
    cache.del(keys);
  }
};

module.exports = {
  cacheMiddleware,
  clearCache
};