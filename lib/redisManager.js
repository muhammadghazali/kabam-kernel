'use strict';
var redis = require('redis'),
  url = require('url'),
  errorMessage = 'Config.REDIS has invalid value. Proper values are ' +
                 '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
                 'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"';


function parseConfig(redisConfig){
  if (typeof redisConfig === 'object') {
    return redisConfig;
  }

  if (typeof redisConfig === 'string') {
    var redisConfigUrlParsed = url.parse(redisConfig);
    if (redisConfigUrlParsed) {
      var config = {
        port: redisConfigUrlParsed.port,
        host: redisConfigUrlParsed.hostname
      };
      if (redisConfigUrlParsed.auth && redisConfigUrlParsed.auth.split(':')[1]) {
        config.auth = redisConfigUrlParsed.auth.split(':')[1];
      }
      return config;
    }
  }

  throw new Error(errorMessage);
}

function validateConfig(redisConfig) {
  var is_valid = (
    (redisConfig.port && redisConfig.host && /^\d+$/.test(redisConfig.port)) ||
    (typeof redisConfig === 'string' && url.parse(redisConfig).protocol === 'redis:')
  );
  if (!is_valid) {
    throw new Error(errorMessage);
  }
  return redisConfig;
}

var redisManager = {};

redisManager.create = function (redisConfig) {
  var redisClient;

  if (redisConfig) {
    redisConfig = validateConfig(parseConfig(redisConfig));
    redisClient = redis.createClient(redisConfig.port, redisConfig.host);
    if (typeof redisConfig.auth === 'string') {
      redisClient.auth(redisConfig.auth);
    }
  } else {
    //redis is NOT configured, we use default properties
    redisClient = redis.createClient();
  }

  return redisClient;
};

module.exports = exports = redisManager;
