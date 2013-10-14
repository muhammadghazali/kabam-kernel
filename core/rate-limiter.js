'use strict';
var async = require('async');

exports.name = 'kabam-core-rate-limiter';

// rate limiting middleware
exports.middleware = [
  function(kernel){
    var redisClient = kernel.redisClient,
      requestsPerMinute = kernel.config.RATE_LIMIT || 400;
    return function (request, response, next) {
      var keyname = 'kabam_rate_' + request.ip,
        now = Math.floor(new Date().getTime() / 1000);

      async.parallel({
        'getRequestsNumber': function (cb) {
          redisClient.get(keyname, cb);
        },
        'getTTL': function (cb) {
          // http://redis.io/commands/ttl
          redisClient.ttl(keyname, cb);
        }
      }, function (err, obj) {
        if (err) {
          throw err;
        }
        response.setHeader('X-RateLimit-Limit', requestsPerMinute);

        //key doesn't exists
        if (obj.getTTL === -2) {
          response.setHeader('X-RateLimit-Reset', (now + 60));
          response.setHeader('X-RateLimit-Reset-In-Seconds', 60);

          async.parallel([
            function (cb) {
              redisClient.set(keyname, 0, cb);
            },
            function (cb) {
              redisClient.expire(keyname, 60, cb);
            }
          ], function (err) {
            if (err) {
              throw err;
            }
          });
        }

        if (obj.getTTL === -1) { //key exists, but ttl is not set
          redisClient.expire(keyname, 60);
        }

        if (obj.getTTL > 0) { //key exists, tts is set
          response.setHeader('X-RateLimit-Reset', (now + obj.getTTL));
          response.setHeader('X-RateLimit-Reset-In-Seconds', obj.getTTL);
        }


        if (obj.getRequestsNumber >= requestsPerMinute) {
          response.setHeader('X-RateLimit-Remaining', 0);
          response.send(429);
          // next(); is NOT CALLED!!!
        } else {
          redisClient.incr(keyname, function (err, value) {
            if (err) {
              throw err;
            }
            response.setHeader('X-RateLimit-Remaining', (requestsPerMinute - value));
            next();
          });
        }
      });
    };
  }
];