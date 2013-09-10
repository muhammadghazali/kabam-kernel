'use strict';
var redis = require('redis'),
  url = require('url');

var redisManager = {};

redisManager.validateConfig = function (redisConfig) {
  if (redisConfig) {
    if (!(
        (redisConfig.port && redisConfig.host && /^\d+$/.test(redisConfig.port)) ||
        (typeof redisConfig === 'string' && url.parse(redisConfig).protocol === 'redis:')
        )
        ) {
      throw new Error('Config.redis have to be a string like redis://usernameIgnored:password@localhost:6379 ' +
        'or object like { "host":"localhost","port":6379 }');
    }
  }
  return true;
};

redisManager.create = function (redisConfig) {
  var redisClient;

  redisManager.validateConfig(redisConfig);

  if (redisConfig) {
    if (typeof redisConfig === 'object') {
      if (redisConfig.port && !(/^[0-9]+$/.test(redisConfig.port))) {
        throw new Error('Config variable of redis has bad value for PORT. Proper values are ' +
          '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
          'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"');
      }
      redisClient = redis.createClient(redisConfig.port, redisConfig.host);
      if (typeof redisConfig.auth === 'string') {
        redisClient.auth(redisConfig.auth);
      }
    } else {
      if (typeof redisConfig === 'string') {
        var redisConfigUrlParsed = url.parse(redisConfig);
        if (redisConfigUrlParsed) {
          redisClient = redis.createClient(redisConfigUrlParsed.port, redisConfigUrlParsed.hostname);
          if (redisConfigUrlParsed.auth && redisConfigUrlParsed.auth.split(':')[1]) {
            redisClient.auth(redisConfigUrlParsed.auth.split(':')[1]);
          }
        } else {
          throw new Error('Config variable of redis has bad value. Proper values are ' +
            '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
            'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"');
        }
      } else {
        throw new Error('Config variable of redis has bad value. Proper values are ' +
          '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
          'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"');
      }
    }
  } else {
    //redis is NOT configured, we use default properties
    redisClient = redis.createClient();
  }

  return redisClient;
};

module.exports = exports = redisManager;
