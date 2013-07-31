/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');


describe('sanity test', function () {
  describe('MWC throws errors when we have strange config object', function () {

    it('throws proper error for empty config object', function () {
      (function () {
        var MWC = mwcCore();
      }).should.throw('Config is not an object!');
    });

    it('throws proper error for config object being not object', function () {
      (function () {
        var MWC = mwcCore('I am pineapple!');
      }).should.throw('Config is not an object!');
    });


    it('throws proper error for config without hostUrl', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': null});
      }).should.throw('Config.hostUrl have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!!!');
    });

    it('throws proper error for config with bad hostUrl', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'I am pineapple!'});
      }).should.throw('Config.hostUrl have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!!!');
    });

    it('throws proper error for undefined secret string', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'http://example.org/'});
      }).should.throw('Config.secret is not set or is to short!');
    });

    it('throws proper error for short secret string', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'http://example.org/', secret: '123'});
      }).should.throw('Config.secret is not set or is to short!');
    });

    it('throws proper error for empty mongoUrl string', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'http://example.org/', secret: 'lalalalala1111'});
      }).should.throw('Config.mongoUrl have to be valid mongoose URI - for example mongodb://user111:111password111@localhost:10053/app111');
    });

    it('throws proper error for "I am banana!" mongoUrl string', function () {
      (function () {
        var MWC = mwcCore({'hostUrl': 'http://example.org', secret: 'lalalalala1111', 'mongoUrl': 'I am banana!'});
      }).should.throw('Config.mongoUrl have to be valid mongoose URI - for example mongodb://user111:111password111@localhost:10053/app111');
    });

    it('throws proper error for redis object without host, port', function () {
      (function () {
        var MWC = mwcCore({
          'hostUrl': 'http://example.org',
          'secret': 'lalalalala1111',
          'mongoUrl': 'mongodb://user111:111password111@localhost:10053/app111',
          'redis': {'notHost': 'localhost', 'notPort': 6379}
        });
      }).should.throw('Config.redis have to be a string like redis://usernameIgnored:password@localhost:6379 or object like { "host":"localhost","port":6379 }');
    });

    it('throws proper error for "I am banana!" as redis string', function () {
      (function () {
        var MWC = mwcCore({
          'hostUrl': 'http://example.org',
          'secret': 'lalalalala1111',
          'mongoUrl': 'mongodb://user111:111password111@localhost:10053/app111',
          'redis': "I am banana!"
        });
      }).should.throw('Config.redis have to be a string like redis://usernameIgnored:password@localhost:6379 or object like { "host":"localhost","port":6379 }');
    });
  });


  describe('MWC throws errors when we try to call extending functions with strange arguments', function () {

    it('throws proper error for MWC.extendCore("i am pineapple!")', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendCore('i am pineapple!');
      }).should.throw('MWC.extendCore requires argument of function(core){...}');
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

    it('throws proper error for MWC.extendMiddlewares("i am pineapple!");', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddlewares('i am pineapple!');
      }).should.throw('Wrong arguments for function MWC.extendMiddlewares(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for MWC.extendMiddlewares([{a:1},{b:1}],function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddlewares([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('#MWC.extendMiddlewares requires environment name to be a string!');
    });

    it('throws proper error for MWC.extendMiddlewares({a:1},function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddlewares({a: 1}, function (core) {
        });
      }).should.throw('Wrong arguments for function MWC.extendMiddlewares(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for MWC.extendMiddlewares("development","wrongPath",function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddlewares('development', 'wrongPath', function (core) {
        });
      }).should.throw('#MWC.extendMiddlewares path to be a middleware valid path, that starts from "/"!');
    });

    it('throws proper error for MWC.extendMiddlewares(["development","staging"],"wrongPath",function(core){})', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendMiddlewares(['development', 'staging'], 'wrongPath', function (core) {
        });
      }).should.throw('#MWC.extendMiddlewares path to be a middleware valid path, that starts from "/"!');
    });

    it('throws proper error for MWC.extendRoutes("i am pineapple!");', function () {
      (function () {
        var MWC = mwcCore(config);
        MWC.extendRoutes('i am pineapple!');
      }).should.throw('Wrong argument for MWC.extendAppRoutes(function(core){...});');
    });

  });

});