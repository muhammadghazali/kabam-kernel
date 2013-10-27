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
  var isValid = (
    (redisConfig.port && redisConfig.host && /^\d+$/.test(redisConfig.port)) ||
      (typeof redisConfig === 'string' && url.parse(redisConfig).protocol === 'redis:')
    );
  if (!isValid) {
    throw new Error(errorMessage);
  }
  return redisConfig;
}


function makeClient(redisConfig) {
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
}



exports.name = 'kabam-core-redis-client';
exports.config = {
  REDIS: {
    doc: 'Redis instance url',
    env: 'REDIS',
    default: null,
    required: false,
    parse: function(value, ParseError){
      if(value !== null){
        var parsed = url.parse(value);
        var hostname = parsed.hostname;
        var port = parsed.port || 6379;
        if(!hostname){
          throw new ParseError('Invalid hostname');
        }
      }
      return value;
    }
  }
};
exports.core = {
  'redisClient': function(config){
    return makeClient(config.REDIS);
  },

  'createRedisClient': function(config){
    /**
     * @ngdoc function
     * @name kabamKernel.createRedisClient
     * @description
     * Create new redis client
     *
     * Use this function with great caution! Because usually redis-database-as-a-service providers have
     * strict connection limit!!! and every one redis client created like this consumes one connection!
     * Usually, Kabam needs only one redis client connection
     * BTW, redis is NOT MySQL - we can't increase speed with connection pooling!
     * @returns {RedisClient} redis client
     */
    return function(){
      return makeClient(config.REDIS);
    };
  }
};
