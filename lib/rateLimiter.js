//http://stackoverflow.com/questions/16022624/examples-of-http-api-rate-limiting-http-response-headers

//res.setHeader('X-RateLimit-Limit', limit);
//res.setHeader('X-RateLimit-Remaining', remaining);
//res.setHeader('X-RateLimit-Reset', resetTime);

var async = require('async');


module.exports = exports = function (redisClient, requestsPerMinute) {
  return function (request, response, next) {
    var keyname = 'mwc_rate_' + request.ip,
      now = new Date().getTime();

    async.parallel({
      'getRequestsNumber': function (cb) {
        redisClient.get(keyname, cb);
      },
      'getTTL': function (cb) {
        redisClient.ttl(keyname, cb);//http://redis.io/commands/ttl
      }
    }, function (err, obj) {

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
          ]);

      }

      if(obj.getTTL === -1){ //ttl is not set
        redisClient.expire(keyname, 60);
      }

      if (obj.getTTL > 0) {
        response.setHeader('X-RateLimit-Reset', (now + obj.getTTL));
        response.setHeader('X-RateLimit-Reset-In-Seconds', obj.getTTL);
      }


      if (obj.getRequestsNumber >= requestsPerMinute) {
        response.setHeader('X-RateLimit-Remaining', 0);
        response.send(429);
        return;
        //next(); is NOT CALLED!!!
      } else {
        redisClient.incr(keyname,function(err,value){
          response.setHeader('X-RateLimit-Remaining', (requestsPerMinute - value));
          next();
        })
      }
    });
  };
};