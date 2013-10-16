/*jshint immed: false */
'use strict';
var should = require('should'),
  async = require('async'),
  kabamKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').testing,
  request = require('request'),
  port = Math.floor(2000 + 1000 * Math.random());

describe('Kernel', function () {

  var Kabam;


  /*
   * Extending core
   */

  var extendModelFunction = function (kabam) {
    var CatsSchema = new kabam.mongoose.Schema({
      'nickname': String
    });

    CatsSchema.index({
      nickname: 1
    });

    return CatsSchema;
  };

  /*
   * Extending Application Parameters
   */

  var extendAppParametersFunction1 = function (core) {
    core.app.set('TempVar1', 'TempVar1');
  };

  var extendAppParametersFunction2 = function (core) {
    core.app.set('TempVar2', 'TempVar2');
  };

  var extendAppParametersFunction3 = function (core) {
    core.app.set('TempVar3', 'TempVar3');
  };

  /*
   * Extending middlewares
   */
  var extendAppMiddlewareFunction1 = function (core) {
    return function (request, response, next) {
      response.setHeader('middleware1', 'middleware1');
      next();
    };
  };

  var extendAppMiddlewareFunction2 = function (core) {
    return function (request, response, next) {
      response.setHeader('middleware2', 'middleware2');
      next();
    };
  };

  var extendAppMiddlewareFunction3 = function (core) {
    return function (request, response, next) {
      response.setHeader('middleware3', 'middleware3');
      next();
    };
  };

  var extendAppMiddlewareFunction4 = function (core) {
    return function (request, response, next) {
      response.setHeader('middleware4', 'middleware4');
      next();
    };
  };

  /* Adding custom routes
   *
   */

  var extendRoutesFunction = function (core) {
    core.app.get('/someRoute', function (req, res) {
      res.send('HI');
    });
  };

  //load plugin as an object

  var extendAppParametersFunctionPlugin = function (core) {
    core.app.set('extendAppParametersFunctionPlugin', 'extended111');
  };

  var extendAppMiddlewareFunctionPlugin = function (core) {
    return function (request, response, next) {
      response.setHeader('extendAppMiddlewareFunctionPlugin', 'OK');
      next();
    };
  };

  var extendRoutesFunctionPlugin = function (core) {
    core.app.get('/newPlugin', function (req, res) {
      res.send('New plugin is installed as object');
    });
  };

  var extendModelFunctionPlugin = function (kabam) {
    var DogsSchema = new kabam.mongoose.Schema({
      'nickname': String
    });
    DogsSchema.index({
      nickname: 1
    });
    return DogsSchema;
  };


  before(function (done) {
    process.setMaxListeners(0);

    Kabam = kabamKernel(config);

    Kabam.extendCore('sum', function (/*config*/) {
      return function (a, b) {
        return a + b;
      };
    });
    Kabam.extendCore(function(){
      return {
        sub: function(a, b){return a-b;}
      };
    });
    Kabam.extendCore('SomeVar', 42);

    Kabam.extendModel('Cats', extendModelFunction);

    Kabam.extendApp(['development', 'staging'], extendAppParametersFunction1);
    Kabam.extendApp('development', extendAppParametersFunction2);
    Kabam.extendApp('production', extendAppParametersFunction3);

    Kabam.extendMiddleware(extendAppMiddlewareFunction1);
    Kabam.extendMiddleware('staging', extendAppMiddlewareFunction2);
    Kabam.extendMiddleware(['staging', 'production'], extendAppMiddlewareFunction3);
    Kabam.extendMiddleware(['development'], '/middleware3Path', extendAppMiddlewareFunction3);
    Kabam.extendMiddleware('development', '/middleware4Path', extendAppMiddlewareFunction4);

    Kabam.extendRoutes(extendRoutesFunction);
    //*/

    Kabam.usePlugin({
      'name': 'unitTestPlugin',
      'core': {'mul': function (config) {
        return function (a, b) {
          return a * b
        }
      }},
      'model': {'Dogs': extendModelFunctionPlugin},
      'app': extendAppParametersFunctionPlugin,
      "middleware": [extendAppMiddlewareFunctionPlugin],
      'routes': extendRoutesFunctionPlugin
    });
    //*/
    //create and start this application
    Kabam.start(port);
    setTimeout(done, 1000);
  });

//  after(function(done){
//    Kabam.mongoose.disconnect();
//    done();
//  });
  describe('Testing exposed objects of running kabamKernel', function () {

    it('can emit and listen to events', function () {
      Kabam.emit.should.be.type('function');
      Kabam.on.should.be.type('function');
    });

    it('exposes redis client', function () {
      Kabam.redisClient.should.be.type('object');
      Kabam.redisClient.set.should.be.type('function');
      Kabam.redisClient.get.should.be.type('function');
      Kabam.redisClient.info.should.be.type('function');
      Kabam.redisClient.auth.should.be.type('function');
    });

    it('exposes mongoose model', function () {
      Kabam.model.should.be.type('object');
    });

    it('exposes mongoose model of users', function () {
      Kabam.model.User.should.be.type('function');
//      Kabam.model.Users.should.be.type('function');
    });

    it('exposes mongoose model of messages', function () {
      Kabam.model.Message.should.be.type('function');
//      Kabam.model.Messages.should.be.type('function');
    });

    it('exposes an ExpressJS application', function () {
      Kabam.app.should.be.type('function');
      Kabam.app.listen.should.be.type('function');
      Kabam.app.use.should.be.type('function');
      Kabam.app.get.should.be.type('function');
      Kabam.app.post.should.be.type('function');
      Kabam.app.delete.should.be.type('function');
    });

    it('throws error when we try to extend readied application', function () {

      (function () {
        Kabam.extendCore(function () {
          throw new Error('Core was extended for READIED application!');
        });
      }).should.throw('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        Kabam.extendApp(['development', 'staging'], function () {
          throw new Error('Core app parameters were extended for READIED application!');
        });
      }).should.throw('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        Kabam.extendMiddleware(['development', 'staging'], function () {
          throw new Error('Core app middlewares were extended for READIED application!');
        });
      }).should.throw('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        Kabam.extendRoutes(function () {
          throw new Error('Core app routes were extended for READIED application!');
        });
      }).should.throw('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        Kabam.usePlugin('kabam_plugin_make_suicide_while_punching_wall_on_high_speed');
      }).should.throw('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');

    });

  });

  describe('Testing kabam_core event emiting system', function () {
    var error,
      message;

    before(function (done) {
      var promise = new events.EventEmitter(),
        kabam = Kabam;

      kabam.on('error', function (err) {
        promise.emit('error', err);
        error = err;
        done();
      });

      kabam.on('ping', function (msg) {
        promise.emit('success', msg);
        message = msg;
        done();
      });

      setTimeout(function () {
        kabam.emit('ping', 'pong');
      }, 100);

    });

    it('emits and catches events by itself', function () {
      should.not.exist(error);
      message.should.be.equal('pong');
    });

  });

  describe('Testing kabam_core express application', function () {
    it('it exposes a #Kabam.app object', function () {
      Kabam.app.should.be.type('function');
    });
  });

  describe('#Kabam.extendCore()', function () {
    it('actually adds new functions to #Kabam', function () {
      Kabam.SomeVar.should.be.equal(42);
      Kabam.sum.should.be.type('function');
      Kabam.sum(2, 2).should.equal(4);
      Kabam.sub.should.be.type('function');
      Kabam.sub(5, 3).should.equal(2);
    });
  });

  describe('#Kabam.extendModel()', function () {

    it('adds the model of "Cats" to #Kabam.model.Cats', function () {
      Kabam.model.Cats.should.be.type('function');
    });
    describe('and the "Cats" model looks like mongoose model', function () {
      it('exposes function find', function () {
        Kabam.model.Cats.find.should.be.type('function');
      });
      it('exposes function findOne', function () {
        Kabam.model.Cats.findOne.should.be.type('function');
      });
      it('exposes function count', function () {
        Kabam.model.Cats.count.should.be.type('function');
      });
      it('exposes function remove', function () {
        Kabam.model.Cats.remove.should.be.type('function');
      });
      it('exposes function create', function () {
        Kabam.model.Cats.create.should.be.type('function');
      });
    });
  });

  describe('#Kabam.extendApp()', function () {
    it('We are running the correct environment', function () {
      if (typeof process.env.NODE_ENV !== 'undefined') {
        process.env.NODE_ENV.should.be.equal('development');
      }
    });

    it('actually works', function () {
      Kabam.app.get('TempVar1').should.equal('TempVar1');
      Kabam.app.get('TempVar2').should.equal('TempVar2');
      if (typeof Kabam.app.get('TempVar3') !== 'undefined') {
        throw new Error('We set app parameter for wrong environment!');
      }
    });
  });

  describe('#Kabam.extendMiddleware()', function () {
    it('We are running the correct environment', function () {
      if (typeof process.env.NODE_ENV !== 'undefined') {
        process.env.NODE_ENV.should.be.equal('development');
      }
    });


    describe('it actually works', function () {
      var response, body;
      before(function (done) {
        request.get('http://localhost:' + port + '/middleware3Path', function (err, res, b) {
          if (err) {
            throw err;
          }
          response = res;
          body = b;
          done();
        });
      });

      it('it starts HTTP server on port localhost:' + port + '', function () {
        response.statusCode.should.equal(404);//this is ok
      });

      it('this server runs a ExpressJS application', function () {
        response.headers['x-powered-by'].should.be.equal('Express');
      });

      it('this application have headers needed by #Kabam.extendMiddleware', function () {
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['middleware3'].should.be.equal('middleware3');
      });
    });
  });

  describe('#Kabam.extendRoutes()', function () {

    it('We are running the correct environment', function () {
      if (typeof process.env.NODE_ENV !== 'undefined') {
        process.env.NODE_ENV.should.be.equal('development');
      }
    });

    describe('it actually works', function () {
      var response, body;
      before(function (done) {
        request.get('http://localhost:' + port + '/someRoute', function (err, res, b) {
          if (err) {
            throw err;
          }
          response = res;
          body = b;
          done();
        });
      });

      it('it starts HTTP server on port localhost:' + port + '', function () {
        response.statusCode.should.equal(200);
        body.should.equal('HI');
      });

      it('this server runs a ExpressJS application', function () {
        response.headers['x-powered-by'].should.be.equal('Express');
      });

      it('this application have headers needed by #Kabam.extendMiddleware', function () {
        response.headers['middleware1'].should.be.equal('middleware1');
      });
    });
  });

  describe('#Kabam.usePlugin(object)', function () {

    describe('extendCore from plugin', function () {

      it('it actually adds new functions to #Kabam.core', function () {
        Kabam.mul.should.be.type('function');
        Kabam.mul(3, 2).should.equal(6);
      });
    });

    describe('extendModel from plugin', function () {
      it('adds the model of "Dogs" to #Kabam.model.Dogs', function () {
        Kabam.model.Dogs.should.be.type('function');
      });
      describe('and the "Dogs" model looks like mongoose model', function () {
        it('exposes function find', function () {
          Kabam.model.Dogs.find.should.be.type('function');
        });
        it('exposes function findOne', function () {
          Kabam.model.Dogs.findOne.should.be.type('function');
        });
        it('exposes function count', function () {
          Kabam.model.Dogs.count.should.be.type('function');
        });
        it('exposes function remove', function () {
          Kabam.model.Dogs.remove.should.be.type('function');
        });
        it('exposes function create', function () {
          Kabam.model.Dogs.create.should.be.type('function');
        });
      });
    });

    describe('extendApp from plugin', function () {

      it('it works', function () {
        Kabam.app.get('extendAppParametersFunctionPlugin').should.equal('extended111');
      });
    });

    describe('extendMiddleware from plugin', function () {

      describe('it actually works', function () {
        var response, body;
        before(function (done) {
          request.get('http://localhost:' + port + '/someRoute', function (err, res, b) {
            if (err) {
              throw err;
            }
            response = res;
            body = b;
            done();
          });
        });

        it('it starts HTTP server on port localhost:' + port + '', function () {
          response.statusCode.should.equal(200);
          body.should.equal('HI');
        });

        it('this server runs a ExpressJS application', function () {
          response.headers['x-powered-by'].should.be.equal('Express');
        });

        it('this  application have headers needed by #Kabam.extendMiddleware', function () {
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });
      });
    });

    describe('extendRoutes from plugin', function () {

      describe('it actually works', function () {
        var response, body;
        before(function (done) {
          request.get('http://localhost:' + port + '/newPlugin', function (err, res, b) {
            if (err) {
              throw err;
            }
            response = res;
            body = b;
            done();
          });
        });

        it('it starts HTTP server on port localhost:' + port + '', function () {
          response.statusCode.should.equal(200);
        });

        it('this server runs a ExpressJS application', function () {
          response.headers['x-powered-by'].should.be.equal('Express');
        });

        it('this application have headers needed by #Kabam.extendMiddleware', function () {
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });

        it('this application serves routes desired', function () {
          response.statusCode.should.equal(200);
          body.should.equal('New plugin is installed as object');
        });
      });

    });
  });

  describe('#Kabam.listen(portNumber)', function () {
    var response, body;
    before(function (done) {
      request.get('http://localhost:' + port + '/someRoute', function (err, res, b) {
        if (err) {
          throw err;
        }
        response = res;
        body = b;
        done();
      });
    });

    it('it starts HTTP server on port localhost:' + port + '', function () {
      response.statusCode.should.equal(200);
      body.should.equal('HI');
    });

    it('this server runs a ExpressJS application', function () {
      response.headers['x-powered-by'].should.be.equal('Express');
    });

    it('this application have headers needed by #Kabam.extendMiddleware', function () {
      response.headers['middleware1'].should.be.equal('middleware1');
    });

    describe('this application have proper rate limiting headers', function () {
      var resetTime = Math.floor(new Date().getTime() / 1000) + 80;
      it('have x-ratelimit-limit to 400', function () {
        parseInt(response.headers['x-ratelimit-limit']).should.be.equal(400);
      });
      it('have the x-ratelimit-reset header with valid value', function () {
        parseInt(response.headers['x-ratelimit-reset']).should.be.below(resetTime);
      });
      it('have the x-ratelimit-reset-in-seconds header with valid value', function () {
        parseInt(response.headers['x-ratelimit-reset-in-seconds']).should.be.below(61);
      });
      it('have the x-ratelimit-remaining header with valid value', function () {
        parseInt(response.headers['x-ratelimit-remaining']).should.be.below(401);
      });
    });

  });

  after(function (done) {
    Kabam.stop();
    done();
  });
});
