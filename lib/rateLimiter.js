//http://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers

//res.setHeader('X-RateLimit-Limit', limit);
//res.setHeader('X-RateLimit-Remaining', remaining);
//res.setHeader('X-RateLimit-Reset', resetTime);
'use strict';
var async = require('async');


module.exports = exports = function (redisClient, requestsPerMinute) {
  return function (request, response, next) {
    var keyname = 'kabam_rate_' + request.ip,
      now = Math.floor(new Date().getTime() / 1000);

    async.parallel({
      'getRequestsNumber': function (cb) {
        redisClient.get(keyname, cb);
      },
      'getTTL': function (cb) {
        redisClient.ttl(keyname, cb);//http://redis.io/commands/ttl
      }
    }, function (err, obj) {
      if (err) {
        throw err;
      }
      response.setHeader('X-RateLimit-Limit', requestsPerMinute);

      if (obj.getTTL === -2) { //key do not exists
        response.setHeader('X-RateLimit-Reset', (now + 60));
        response.setHeader('X-RateLimit-Reset-In-Seconds', 60);

        async.parallel(
          [
            function (cb) {
              redisClient.set(keyname, 0, cb);
            },
            function (cb) {
              redisClient.expire(keyname, 60, cb);
            }
          ],
          function (err) {
            if (err) {
              throw err;
            }
          }
        );

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
        response.send(429); //express knows about it, it's cool
        //next(); is NOT CALLED!!!
      } else {
        redisClient.incr(keyname, function (err, value) {
          if (err) {
            throw err;
          }
          response.setHeader('X-RateLimit-Remaining', (requestsPerMinute - value));
          next();
        });
      }
      return;
    });
  };
};