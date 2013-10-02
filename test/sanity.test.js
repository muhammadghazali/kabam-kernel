/*jshint immed: false */
'use strict';
var should = require('should'),
  async = require('async'),
  kabamKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');


describe('sanity test', function () {

  describe('kabam throws errors when we have strange config object', function () {

    it('throws proper error for empty config object as we try to recreate it in this case');

    it('throws proper error for config object being not object', function () {
      (function () {
        var Kabam = kabamKernel('I am pineapple!');
        Kabam.start('app');
      }).should.throw('Config is not an object!');
    });


    it('throws proper error for config without HOST_URL - we try to guess it from os.hostname()');

    it('throws proper error for config with bad HOST_URL', function () {
      (function () {
        var Kabam = kabamKernel({'HOST_URL': 'I am pineapple!'});
        Kabam.start('app');
      }).should.throw('Config.HOST_URL have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!');
    });

    it('throws proper error for too short secret string', function () {
      (function () {
        var Kabam = kabamKernel({'HOST_URL': 'http://example.org/', 'SECRET': '123'});
        Kabam.start('app');
      }).should.throw('Config.SECRET is to short!');
    });

    it('throws proper error for empty MONGO_URL string, pending, because we guess MONGO_URL from environment');
    /*/
     it('throws proper error for "I am banana!" mongoUrl string', function () {
     var mongoUrl = process.env.mongoUrl;
     process.env.mongoUrl = null;
     (function () {
     var kabam = kabamKernel({'hostUrl': 'http://example.org', secret: 'lalalalala1111', 'mongoUrl': 'I am banana!'});
     }).should.throw('Config.mongoUrl have to be valid mongoose URI - for example mongodb://user111:111password111@localhost:10053/app111');
     process.env.mongoUrl = mongoUrl;
     });

     it('throws proper error for redis object without host, port', function () {
     var redis = process.env.redis;
     process.env.redis = null;
     (function () {
     var kabam = kabamKernel({
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
     var kabam = kabamKernel({
     'hostUrl': 'http://example.org',
     'secret': 'lalalalala1111',
     'mongoUrl': 'mongodb://user111:111password111@localhost:10053/app111',
     'redis': "I am banana!"
     });
     }).should.throw('Config.redis have to be a string like redis://usernameIgnored:password@localhost:6379 or object like { "host":"localhost","port":6379 }');
     process.env.redis = redis;
     });
     //*/
  });


  describe('kabam throws errors when we try to call extending functions with strange arguments', function () {

    it('throws proper error for KabamKernel.extendCore("i am pineapple!")', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendCore('i am pineapple!');
      }).should.throw('KabamKernel.extendCore requires argument of fieldName(string), and value - function(config){} or object!');
    });

    it('throws proper error for KabamKernel.extendModel("i am pineapple!")', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendModel('i am pineapple!');
      }).should.throw('KabamKernel.extendModel requires arguments of string of "modelName" and function(core){...}');
    });

    it('throws proper error for trying KabamKernel.extendModel("Users",function()), because  "Users" is reserved name', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendModel('Users', function () {
        });
      }).should.throw('Error extending model, "User(s)" and "Message(s)" are reserved name');
    });

    it('throws proper error for trying KabamKernel.extendModel("User",function()), because  "Users" is reserved name', function () {
      (function () {
        var Kabam = kabamKernel(config);
        Kabam.extendModel('User', function () {
        });
      }).should.throw('Error extending model, "User(s)" and "Message(s)" are reserved name');
    });

    it('throws proper error for trying KabamKernel.extendModel("Message",function()), because  "Users" is reserved name', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendModel('User', function () {
        });
      }).should.throw('Error extending model, "User(s)" and "Message(s)" are reserved name');
    });

    it('throws proper error for trying KabamKernel.extendModel("Messages",function()), because  "Users" is reserved name', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendModel('User', function () {
        });
      }).should.throw('Error extending model, "User(s)" and "Message(s)" are reserved name');
    });

    it('throws proper error for KabamKernel.extendApp("i am pineapple!");', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendApp('i am pineapple!');
      }).should.throw('Wrong arguments for extendApp(arrayOrStringOfEnvironments,settingsFunction)');
    });

    it('throws proper error for KabamKernel.extendApp([{a:1},{b:1}],function(core){});', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendApp([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('KabamKernel.extendApp requires environment name to be a string!');
    });

    it('throws proper error for KabamKernel.extendApp({b:1},function(core){});', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendApp([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('KabamKernel.extendApp requires environment name to be a string!');
    });

    it('throws proper error for KabamKernel.extendMiddleware("i am pineapple!");', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendMiddleware('i am pineapple!');
      }).should.throw('Wrong arguments for function KabamKernel.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for KabamKernel.extendMiddleware([{a:1},{b:1}],function(core){})', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendMiddleware([
          {a: 1},
          {b: 1}
        ], function (core) {
        });
      }).should.throw('KabamKernel.extendMiddleware requires environment name to be a string!');
    });

    it('throws proper error for KabamKernel.extendMiddleware({a:1},function(core){})', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendMiddleware({a: 1}, function (core) {
        });
      }).should.throw('Wrong arguments for function KabamKernel.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for kabam.extendMiddleware("development","wrongPath",function(core){})', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendMiddleware('development', 'wrongPath', function (core) {
        });
      }).should.throw('KabamKernel.extendMiddleware path to be a middleware valid path, that starts from "/"!');
    });

    it('throws proper error for kabam.extendMiddleware(["development","staging"],"wrongPath",function(core){})', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendMiddleware(['development', 'staging'], 'wrongPath', function (core) {
        });
      }).should.throw('KabamKernel.extendMiddleware path to be a middleware valid path, that starts from "/"!');
    });

    it('throws proper error for kabam.extendRoutes("i am pineapple!");', function () {
      (function () {
        var kabam = kabamKernel(config);
        kabam.extendRoutes('i am pineapple!');
      }).should.throw('Wrong argument for KabamKernel.extendAppRoutes(function(core){...});');
    });

  });

});
