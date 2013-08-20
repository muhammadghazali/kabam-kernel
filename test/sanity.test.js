/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');


describe('sanity test', function () {

  describe('MWC throws errors when we have strange config object', function () {

    it('throws proper error for empty config object as we try to recreate it in this case');

    it('throws proper error for config object being not object', function () {
      (function () {
        var MWC = mwcCore('I am pineapple!');
      }).should.throw('Config is not an object!');
    });


    it('throws proper error for config without hostUrl - we try to guess it from os.hostname()');

    it('throws proper error for config with bad hostUrl', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'I am pineapple!'});
      }).should.throw('Config.hostUrl have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!!!');
    });

    it('throws proper error for too short secret string', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'http://example.org/','secret':'123'});
      }).should.throw('Config.secret is not set or is to short!');
    });

    it('throws proper error for empty mongoUrl string, pending, because we guess mongoUrl from environment');

    it('throws proper error for "I am banana!" mongoUrl string', function () {
      var mongoUrl = process.env.mongoUrl;
      process.env.mongoUrl = null;
      (function () {
        var MWC = mwcCore({'hostUrl': 'http://example.org', secret: 'lalalalala1111', 'mongoUrl': 'I am banana!'});
      }).should.throw('Config.mongoUrl have to be valid mongoose URI - for example mongodb://user111:111password111@localhost:10053/app111');
      process.env.mongoUrl = mongoUrl;
    });

    it('throws proper error for redis object without host, port', function () {
      var redis = process.env.redis;
      process.env.redis = null;
      (function () {
        var MWC = mwcCore({
          'hostUrl': 'http://example.org',
          'secret': 'lalalalala1111',
          'mongoUrl': 'mongodb://user111:111password111@localhost:10053/app111',
          'redis': {'notHost': 'localhost', 'notPort': 6379}
        });
      }).should.throw('Config.redis have to be a string like redis://usernameIgnored:password@localhost:6379 or object like { "host":"localhost","port":6379 }');
      process.env.redis = redis;
    });

    it('throws proper error for "I am banana!" as redis string', function () {
      var redis = process.env.redis;
      process.env.redis = null;
      (function () {
        var MWC = mwcCore({
          'hostUrl': 'http://example.org',
          'secret': 'lalalalala1111',
          'mongoUrl': 'mongodb://user111:111password111@localhost:10053/app111',
          'redis': "I am banana!"
        });
      }).should.throw('Config.redis have to be a string like redis://usernameIgnored:password@localhost:6379 or object like { "host":"localhost","port":6379 }');
     process.env.redis = redis;
    });
  });


  describe('MWC throws errors when we try to call extending functions with strange arguments', function () {

    it('throws proper error for MWC.extendCore("i am pineapple!")', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendCore('i am pineapple!');
      }).should.throw('MWC.extendCore requires argument of fieldName(string), and value - function(config){} or object!');
    });

    it('throws proper error for MWC.extendModel("i am pineapple!")', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendModel('i am pineapple!');
      }).should.throw('MWC.extendModel requires arguments of string of "modelName" and function(core){...}');
    });

    it('throws proper error for trying MWC.extendModel("Users",function()), because  "Users" is reserved name', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendModel('Users', function () {
        });
      }).should.throw('Error extending model, "Users" is reserved name');
    });

    it('throws proper error for MWC.extendApp("i am pineapple!");', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendApp('i am pineapple!');
      }).should.throw('Wrong arguments for extendApp(arrayOrStringOfEnvironments,settingsFunction)');
    });

    it('throws proper error for MWC.extendApp([{a:1},{b:1}],function(core){});', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendApp([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('#MWC.extendApp requires environment name to be a string!');
    });

    it('throws proper error for MWC.extendApp({b:1},function(core){});', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendApp([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('#MWC.extendApp requires environment name to be a string!');
    });

    it('throws proper error for MWC.extendMiddleware("i am pineapple!");', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddleware('i am pineapple!');
      }).should.throw('Wrong arguments for function MWC.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for MWC.extendMiddleware([{a:1},{b:1}],function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddleware([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('#MWC.extendMiddleware requires environment name to be a string!');
    });

    it('throws proper error for MWC.extendMiddleware({a:1},function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddleware({a: 1}, function (core) {
        });
      }).should.throw('Wrong arguments for function MWC.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for MWC.extendMiddleware("development","wrongPath",function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddleware('development', 'wrongPath', function (core) {
        });
      }).should.throw('#MWC.extendMiddleware path to be a middleware valid path, that starts from "/"!');
    });

    it('throws proper error for MWC.extendMiddleware(["development","staging"],"wrongPath",function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddleware(['development', 'staging'], 'wrongPath', function (core) {
        });
      }).should.throw('#MWC.extendMiddleware path to be a middleware valid path, that starts from "/"!');
    });

    it('throws proper error for MWC.extendRoutes("i am pineapple!");', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendRoutes('i am pineapple!');
      }).should.throw('Wrong argument for MWC.extendAppRoutes(function(core){...});');
    });

  });

});
