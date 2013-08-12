/*jshint immed: false */
var should = require('should'),
  async = require('async'),
  mwcKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');

describe('Kernel', function () {

  var MWC;


  /*
   * Extending core
   */


  /*
   * Extending model
   */

  var extendModelFunction = function (mongoose, config) {
    var CatsSchema = new mongoose.Schema({
      'nickname': String
    });

    CatsSchema.index({
      nickname: 1
    });

    return mongoose.model('cats', CatsSchema);
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

  var extendModelFunctionPlugin = function (mongoose, config) {
    var DogsSchema = new mongoose.Schema({
      'nickname': String
    });
    DogsSchema.index({
      nickname: 1
    });
    return mongoose.model('dogs', DogsSchema);
  };


  before(function (done) {
    MWC = mwcKernel(config);

    MWC.extendCore('sum', function (config) {
      return function (a, b) {
        return a + b;
      }
    });
    MWC.extendCore('SomeVar', 42);

    MWC.extendModel('Cats', extendModelFunction);

    MWC.extendApp(['development', 'staging'], extendAppParametersFunction1);
    MWC.extendApp('development', extendAppParametersFunction2);
    MWC.extendApp('production', extendAppParametersFunction3);

    MWC.extendMiddleware(extendAppMiddlewareFunction1);
    MWC.extendMiddleware('staging', extendAppMiddlewareFunction2);
    MWC.extendMiddleware(['staging', 'production'], extendAppMiddlewareFunction3);
    MWC.extendMiddleware(['development'], '/middleware3Path', extendAppMiddlewareFunction3);
    MWC.extendMiddleware('development', '/middleware4Path', extendAppMiddlewareFunction4);

    MWC.extendRoutes(extendRoutesFunction);
    //*/

    MWC.usePlugin({
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
    MWC.start(3000);
    setTimeout(done, 1000);
  });

//  after(function(done){
//    MWC.mongoose.disconnect();
//    done();
//  });
  describe('Testing exposed objects of running mwcKernel', function () {

    it('can emit and listen to events', function () {
      MWC.emit.should.be.a('function');
      MWC.on.should.be.a('function');
    });

    it('exposes redis client', function () {
      MWC.redisClient.should.be.a('object');
      MWC.redisClient.set.should.be.a('function');
      MWC.redisClient.get.should.be.a('function');
      MWC.redisClient.info.should.be.a('function');
      MWC.redisClient.auth.should.be.a('function');
    });

    it('exposes mongoose model', function () {
      MWC.model.should.be.a('object');
    });

    it('exposes mongoose model of users', function () {
      MWC.model.User.should.be.a('function');
    });

    it('exposes an ExpressJS application', function () {
      MWC.app.should.be.a('function');
      MWC.app.get('port').should.equal(3000);
      MWC.app.listen.should.be.a('function');
      MWC.app.use.should.be.a('function');
      MWC.app.get.should.be.a('function');
      MWC.app.post.should.be.a('function');
      MWC.app.delete.should.be.a('function');
    });

    it('throws error when we try to extend readied application', function () {

      (function () {
        MWC.extendCore(function () {
          throw new Error('Core was extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        MWC.extendApp(['development', 'staging'], function () {
          throw new Error('Core app parameters were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        MWC.extendMiddleware(['development', 'staging'], function () {
          throw new Error('Core app middlewares were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        MWC.extendRoutes(function () {
          throw new Error('Core app routes were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function () {
        MWC.usePlugin('mwc_plugin_make_suicide_while_punching_wall_on_high_speed');
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

    });

  });

  describe('Testing mwc_core event emiting system', function () {
    var error,
      message;

    before(function (done) {
      var promise = new events.EventEmitter(),
        mwc = MWC;

      mwc.on('error', function (err) {
        promise.emit('error', err);
        error = err;
        done();
      });

      mwc.on('ping', function (msg) {
        promise.emit('success', msg);
        message = msg;
        done();
      });

      setTimeout(function () {
        mwc.emit('ping', 'pong');
      }, 100);

    });

    it('emits and catches events by itself', function () {
      should.not.exist(error);
      message.should.be.equal('pong');
    });

  });

  describe('Testing mwc_core express application', function () {
    it('it exposes a #MWC.app object', function () {
      MWC.app.should.be.a('function');
    });
  });

  describe('#MWC.extendCore()', function () {


    it('actually adds new functions to #MWC', function () {
      MWC.shared.SomeVar.should.be.equal(42);
      MWC.shared.sum.should.be.a('function');
      MWC.shared.sum(2, 2).should.equal(4);
    });
  });

  describe('#MWC.extendModel()', function () {

    it('adds the model of "Cats" to #MWC.model.Cats', function () {
      MWC.model.Cats.should.be.a('function');
    });
    describe('and the "Cats" model looks like mongoose model', function () {
      it('exposes function find', function () {
        MWC.model.Cats.find.should.be.a('function');
      });
      it('exposes function findOne', function () {
        MWC.model.Cats.findOne.should.be.a('function');
      });
      it('exposes function count', function () {
        MWC.model.Cats.count.should.be.a('function');
      });
      it('exposes function remove', function () {
        MWC.model.Cats.remove.should.be.a('function');
      });
      it('exposes function create', function () {
        MWC.model.Cats.create.should.be.a('function');
      });
    });
  });

  describe('#MWC.extendApp()', function () {
    it('We are running the correct environment', function () {
      if (typeof process.env.NODE_ENV !== 'undefined') {
        process.env.NODE_ENV.should.be.equal('development');
      }
    });

    it('actually works', function () {
      MWC.app.get('TempVar1').should.equal('TempVar1');
      MWC.app.get('TempVar2').should.equal('TempVar2');
      if (typeof MWC.app.get('TempVar3') !== 'undefined') {
        throw new Error('We set app parameter for wrong environment!');
      }
    });
  });

  describe('#MWC.extendMiddleware()', function () {
    it('We are running the correct environment', function () {
      if (typeof process.env.NODE_ENV !== 'undefined') {
        process.env.NODE_ENV.should.be.equal('development');
      }
    });


    describe('it actually works', function () {
      var response, body;
      before(function (done) {
        request.get('http://localhost:3000/middleware3Path', function (err, res, b) {
          if (err) {
            throw err;
          }
          response = res;
          body = b;
          done();
        });
      });

      it('it starts HTTP server on port localhost:3000', function () {
        response.statusCode.should.equal(404);//this is ok
      });

      it('this server runs a ExpressJS application', function () {
        response.headers['x-powered-by'].should.be.equal('Express');
      });

      it('this application have headers needed by #MWC.extendMiddleware', function () {
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['middleware3'].should.be.equal('middleware3');
      });
    });
  });

  describe('#MWC.extendRoutes()', function () {

    it('We are running the correct environment', function () {
      if (typeof process.env.NODE_ENV !== 'undefined') {
        process.env.NODE_ENV.should.be.equal('development');
      }
    });

    describe('it actually works', function () {
      var response, body;
      before(function (done) {
        request.get('http://localhost:3000/someRoute', function (err, res, b) {
          if (err) {
            throw err;
          }
          response = res;
          body = b;
          done();
        });
      });

      it('it starts HTTP server on port localhost:3000', function () {
        response.statusCode.should.equal(200);
        body.should.equal('HI');
      });

      it('this server runs a ExpressJS application', function () {
        response.headers['x-powered-by'].should.be.equal('Express');
      });

      it('this application have headers needed by #MWC.extendMiddleware', function () {
        response.headers['middleware1'].should.be.equal('middleware1');
      });
    });
  });
//*/
  describe('#MWC.usePlugin(object)', function () {

    describe('extendCore from plugin', function () {

      it('it actually adds new functions to #MWC.core', function () {
        MWC.unitTestPlugin.mul.should.be.a('function');
        MWC.unitTestPlugin.mul(3, 2).should.equal(6);
      });
    });

    describe('extendModel from plugin', function () {
      it('adds the model of "Dogs" to #MWC.model.Dogs', function () {
        MWC.model.Dogs.should.be.a('function');
      });
      describe('and the "Dogs" model looks like mongoose model', function () {
        it('exposes function find', function () {
          MWC.model.Dogs.find.should.be.a('function');
        });
        it('exposes function findOne', function () {
          MWC.model.Dogs.findOne.should.be.a('function');
        });
        it('exposes function count', function () {
          MWC.model.Dogs.count.should.be.a('function');
        });
        it('exposes function remove', function () {
          MWC.model.Dogs.remove.should.be.a('function');
        });
        it('exposes function create', function () {
          MWC.model.Dogs.create.should.be.a('function');
        });
      });
    });

    describe('extendApp from plugin', function () {

      it('it works', function () {
        MWC.app.get('extendAppParametersFunctionPlugin').should.equal('extended111');
      });
    });

    describe('extendMiddleware from plugin', function () {

      describe('it actually works', function () {
        var response, body;
        before(function (done) {
          request.get('http://localhost:3000/someRoute', function (err, res, b) {
            if (err) {
              throw err;
            }
            response = res;
            body = b;
            done();
          });
        });

        it('it starts HTTP server on port localhost:3000', function () {
          response.statusCode.should.equal(200);
          body.should.equal('HI');
        });

        it('this server runs a ExpressJS application', function () {
          response.headers['x-powered-by'].should.be.equal('Express');
        });

        it('this  application have headers needed by #MWC.extendMiddleware', function () {
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });
      });
    });

    describe('extendRoutes from plugin', function () {

      describe('it actually works', function () {
        var response, body;
        before(function (done) {
          request.get('http://localhost:3000/newPlugin', function (err, res, b) {
            if (err) {
              throw err;
            }
            response = res;
            body = b;
            done();
          });
        });

        it('it starts HTTP server on port localhost:3000', function () {
          response.statusCode.should.equal(200);
        });

        it('this server runs a ExpressJS application', function () {
          response.headers['x-powered-by'].should.be.equal('Express');
        });

        it('this application have headers needed by #MWC.extendMiddleware', function () {
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
//*/
  describe('#MWC.listen(portNumber)', function () {
    var response, body;
    before(function (done) {
      request.get('http://localhost:3000/someRoute', function (err, res, b) {
        if (err) {
          throw err;
        }
        response = res;
        body = b;
        done();
      });
    });

    it('it starts HTTP server on port localhost:3000', function () {
      response.statusCode.should.equal(200);
      body.should.equal('HI');
    });

    it('this server runs a ExpressJS application', function () {
      response.headers['x-powered-by'].should.be.equal('Express');
    });

    it('this application have headers needed by #MWC.extendMiddleware', function () {
      response.headers['middleware1'].should.be.equal('middleware1');
    });

    describe('this application have proper rate limiting headers', function () {
      var resetTime = Math.floor(new Date().getTime() / 1000) + 80;
      it('have x-ratelimit-limit to 200', function () {
        parseInt(response.headers['x-ratelimit-limit']).should.be.equal(200);
      });
      it('have the x-ratelimit-reset header with valid value', function () {
        parseInt(response.headers['x-ratelimit-reset']).should.be.below(resetTime);
      });
      it('have the x-ratelimit-reset-in-seconds header with valid value', function () {
        parseInt(response.headers['x-ratelimit-reset-in-seconds']).should.be.below(61);
      });
      it('have the x-ratelimit-remaining header with valid value', function () {
        parseInt(response.headers['x-ratelimit-remaining']).should.be.below(201);
      });
    });

  });

  describe('Users model', function () {

    describe('Testing mwc_core mongoose model of users:', function () {
      it('exposes function find', function () {
        MWC.model.User.find.should.be.a('function');
      });
      it('exposes function findOne', function () {
        MWC.model.User.findOne.should.be.a('function');
      });
      it('exposes function findOneByLoginOrEmail', function () {
        MWC.model.User.findOneByLoginOrEmail.should.be.a('function');
      });
      it('exposes function findOneByApiKey', function () {
        MWC.model.User.findOneByApiKey.should.be.a('function');
      });
      it('exposes function count', function () {
        MWC.model.User.count.should.be.a('function');
      });
      it('exposes function remove', function () {
        MWC.model.User.remove.should.be.a('function');
      });
      it('exposes function create', function () {
        MWC.model.User.create.should.be.a('function');
      });

      it('exposes function getByRole', function () {
        MWC.model.User.getByRole.should.be.a('function');
      });

      it('exposes function signUp', function () {
        MWC.model.User.signUp.should.be.a('function');
      });

      it('exposes function findOneByApiKeyAndVerify', function () {
        MWC.model.User.findOneByApiKeyAndVerify.should.be.a('function');
      });

      it('exposes function findOneByApiKeyAndResetPassword', function () {
        MWC.model.User.findOneByApiKeyAndResetPassword.should.be.a('function');
      });

      it('exposes function processOAuthProfile', function () {
        MWC.model.User.processOAuthProfile.should.be.a('function');
      });


      describe('finders', function () {
        var usersFound;
        before(function (done) {
          MWC.model.User.create({
            'username': 'testSubject47111',
            'email': 'ostroumov4@teksi.ru',
            'apiKey': 'vseBydetHorosho'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            async.parallel({
              'byLogin': function (cb) {
                MWC.model.User.findOneByLoginOrEmail('testSubject47111', cb);
              },
              'byEmail': function (cb) {
                MWC.model.User.findOneByLoginOrEmail('ostroumov4@teksi.ru', cb);
              },
              'byApiKey': function (cb) {
                MWC.model.User.findOneByApiKey('vseBydetHorosho', cb);
              },
              'created': function (cb) {
                cb(null, userCreated);
              }
            }, function (err, res) {
              if (err) {
                throw err;
              }
              usersFound = res;
              done();
            });
          });
        });

        it('we created correct user to be sure', function () {
          usersFound.created.username.should.be.equal('testSubject47111');
          usersFound.created.email.should.be.equal('ostroumov4@teksi.ru');
          usersFound.created.apiKey.should.be.equal('vseBydetHorosho');
        });

        it('findOneByLoginOrEmail works for login', function () {
          usersFound.created._id.should.eql(usersFound.byLogin._id);
        });

        it('findOneByLoginOrEmail works for Email', function () {
          usersFound.created._id.should.eql(usersFound.byEmail._id);
        });

        it('findOneByApiKey works', function () {
          usersFound.created._id.should.eql(usersFound.byApiKey._id);
        });

        after(function (done) {
          usersFound.created.remove(done);
        });
      });

      describe('signUp', function () {
        var user;
        before(function (done) {
          MWC.model.User.signUp('johndoe', 'johndoe@example.org', 'waterfall', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });
        it('creates user with desired username', function () {
          user.username.should.be.equal('johndoe');
        });
        it('creates user with desired email', function () {
          user.email.should.be.equal('johndoe@example.org');
        });

        it('creates user with LOOOONG salt and password', function () {
          user.apiKey.length.should.be.above(63);
          user.apiKey.length.should.be.above(63);
        });

        it('creates user with desired password', function () {
          user.verifyPassword('waterfall').should.be.true;
          user.verifyPassword('fiflesAndFuffles').should.be.false;
        });

        it('creates user with apiKey present', function () {
          user.apiKey.length.should.be.above(5);
        });

        it('creates user with actual apiKey', function () {
          var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
          ago.should.be.below(10 * 1000); //10 seconds
        });

        it('creates user with emailVerified being FALSE', function () {
          user.emailVerified.should.be.false;
        });

        it('creates ordinary user, not root', function () {
          user.root.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('signUpByEmailOnly', function () {
        var user;
        before(function (done) {
          MWC.model.User.signUpByEmailOnly('johndoe@example.org', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('creates user without username', function () {
          should.not.exist(user.username);
        });

        it('creates user with LOOOONG salt and password', function () {
          user.apiKey.length.should.be.above(63);
          user.apiKey.length.should.be.above(63);
        });

        it('creates user with apiKey present', function () {
          user.apiKey.length.should.be.above(5);
        });

        it('creates user with actual apiKey', function () {
          var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
          ago.should.be.below(10 * 1000); //10 seconds
        });

        it('creates user with emailVerified being TRUE', function () {
          user.emailVerified.should.be.true;
        });

        it('creates ordinary user, not root', function () {
          user.root.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('findOneByApiKeyAndVerify for correct apiKey', function () {
        var user, userBeingActivated;
        before(function (done) {
          MWC.model.User.create({
            'username': 'oneByApiKey',
            'email': 'oneByApiKey@teksi.ru',
            'apiKey': 'vseBydetHoroshooneByApiKey',
            'emailVerified': false,
            'apiKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.User.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey', function (err, userActivated) {
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('it finds the user we created', function () {
          userBeingActivated._id.should.eql(user._id);
        });

        it('set emailVerified to TRUE', function () {
          userBeingActivated.emailVerified.should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndVerify for wrong apiKey', function () {
        var user, userBeingActivated, errorThrown;
        before(function (done) {
          MWC.model.User.create({
            'username': 'oneByApiKey',
            'email': 'oneByApiKey@teksi.ru',
            'apiKey': 'vseBydetHoroshooneByApiKey',
            'emailVerified': false,
            'apiKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.User.findOneByApiKeyAndVerify('vseIdetPoPlanu', function (err, userActivated) {
              errorThrown = err;
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do NOT returns the user', function () {
          should.not.exists(userBeingActivated);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndVerify for outdated apiKey', function () {
        var user, userBeingActivated, errorThrown;
        before(function (done) {
          MWC.model.User.create({
            'username': 'oneByApiKey',
            'email': 'oneByApiKey@teksi.ru',
            'apiKey': 'vseBydetHoroshooneByApiKey',
            'emailVerified': false,
            'apiKeyCreatedAt': new Date(1986, 1, 12, 11, 45, 36, 21)
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.User.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey', function (err, userActivated) {
              errorThrown = err;
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do NOT returns the user', function () {
          should.not.exists(userBeingActivated);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('findOneByApiKeyAndResetPassword for good api key', function () {
        var user, userWithPasswordReseted;
        before(function (done) {
          async.waterfall([

            function (cb) {
              MWC.model.User.create({
                'username': 'iForgotMyPassWordIamStupid',
                'email': 'iForgotMyPassWordIamStupid@teksi.ru',
                'apiKey': 'iForgotMyPassWordIamStupid1111',
                'emailVerified': true,
                'apiKeyCreatedAt': new Date()
              }, function (err, userCreated) {
                if (err) {
                  throw err;
                }
                user = userCreated;
                userCreated.setPassword('lalala', function (err) {
                  cb(err, userCreated);
                });
              });
            },
            function (user1, cb) {
              MWC.model.User.findOneByApiKeyAndResetPassword('iForgotMyPassWordIamStupid1111', 'lalala2', function (err1, userChanged) {
                if (err1) {
                  cb(err1);
                } else {
                  cb(null, userChanged);
                }
              });
            }
          ],
            function (err, userChanged2) {
              if (err) {
                throw err;
              }
              userWithPasswordReseted = userChanged2;
              done();
            });
        });

        it('it finds the user we created', function () {
          userWithPasswordReseted._id.should.eql(user._id);
        });

        it('and the user have new password', function () {
          userWithPasswordReseted.verifyPassword('lalala1').should.be.false;
          userWithPasswordReseted.verifyPassword('lalala2').should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndResetPassword for bad api key', function () {
        var user, userNotFound, errorThrown;
        before(function (done) {
          MWC.model.User.create({
            'username': 'iForgotMyPassWordIamStupid',
            'email': 'iForgotMyPassWordIamStupid@teksi.ru',
            'apiKey': 'iForgotMyPassWordIamStupid1111',
            'emailVerified': true,
            'apiKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.User.findOneByApiKeyAndResetPassword('thisIsNotCorrectApiKey', 'lalala2', function (err1, userChanged) {
              errorThrown = err1;
              userNotFound = userChanged
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do not returns user in callback', function () {
          should.not.exists(userNotFound);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndResetPassword for outdated api key', function () {
        var user, userNotFound, errorThrown;
        before(function (done) {
          MWC.model.User.create({
            'username': 'iForgotMyPassWordIamStupid',
            'email': 'iForgotMyPassWordIamStupid@teksi.ru',
            'apiKey': 'iForgotMyPassWordIamStupid1111',
            'emailVerified': true,
            'apiKeyCreatedAt': new Date(1986, 1, 12, 11, 45, 36, 21)
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.User.findOneByApiKeyAndResetPassword('iForgotMyPassWordIamStupid1111', 'lalala2', function (err1, userChanged) {
              errorThrown = err1;
              userNotFound = userChanged
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do not returns user in callback', function () {
          should.not.exists(userNotFound);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('processOAuthProfile for user in database', function () {
        var user, userFound;
        before(function (done) {
          MWC.model.User.signUp('johnDoe', 'johndoe@example.org', 'suzan123', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.User.processOAuthProfile('johndoe@example.org', function (error, userFromProfile) {
              if (error) {
                throw error;
              }
              userFound = userFromProfile;
              done();
            });

          });
        });

        it('finds exactly the user we need', function () {
          user._id.should.eql(userFound._id);
        });

        it('user is not verified as we need it', function () {
          user.emailVerified.should.be.false;
        });

        it('user have complete profile as we need it', function () {
          user.profileComplete.should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('processOAuthProfile for user NOT in database', function () {
        var user;
        before(function (done) {
          MWC.model.User.processOAuthProfile('johndoe@mail.ru', function (error, userFromProfile) {
            if (error) {
              throw error;
            }
            user = userFromProfile;
            done();
          });
        });

        it('creates a uncompleted profile for this user', function () {
          user.email.should.be.equal('johndoe@mail.ru');
          user.emailVerified.should.be.true;
          user.profileComplete.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('keychain', function () {

        describe('findByKeychain', function () {
          var user, userFound;

          before(function (done) {
            MWC.model.User.create({
              'username': 'test888',
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              MWC.model.User.findOneByKeychain('github', 11111, function (err, usr) {
                userFound = usr;
                done();
              });
            });
          });

          it('finds correct user', function () {
            userFound._id.should.eql(user._id);
          });

          after(function (done) {
            user.remove(done);
          });
        });

        describe('setKeyChain', function () {
          var user, userUpdated;

          before(function (done) {
            MWC.model.User.create({
              'username': 'test888',
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              user.setKeyChain('someProvider', 1, function (err2) {
                if (err2) {
                  throw err2;
                }
                MWC.model.User.findOneByKeychain('someProvider', 1, function (err, usr) {
                  userUpdated = usr;
                  done();
                });
              });
            });

            it('finds correct user', function () {
              userUpdated._id.should.eql(user._id);
            });

            it('finds correct user', function () {
              userUpdated.keychain.github.should.be.equal(11111);
              userUpdated.keychain.someProvider.should.be.equal(1);
            });


            after(function (done) {
              user.remove(done);
            });
          });
        });

        describe('revokeKeyChain', function () {
          var user, userUpdated;

          before(function (done) {
            MWC.model.User.create({
              'username': 'test888',
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111,
                'someProvider': 1
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              user.revokeKeyChain('someProvider', 1, function (err2) {
                if (err2) {
                  throw err2;
                }
                MWC.model.User.findOneByKeychain('github', 11111, function (err, usr) {
                  userUpdated = usr;
                  done();
                });
              });
            });

            it('finds correct user', function () {
              userUpdated._id.should.eql(user._id);
            });

            it('finds correct user', function () {
              userUpdated.keychain.github.should.be.equal(11111);
              should.not.exist(userUpdated.keychain.someProvider);
            });


            after(function (done) {
              user.remove(done);
            });
          });
        });
      });

    });
    describe('Testing mwc_core mongoose model one instance of user:', function () {
      describe('general function are callable', function () {
        var user;

        before(function (done) {
          MWC.model.User.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('user instance have functions needed', function () {
          user.verifyPassword.should.be.a('function');
          user.setPassword.should.be.a('function');
          user.invalidateSession.should.be.a('function');

          user.grantRole.should.be.a('function');
          user.hasRole.should.be.a('function');
          user.revokeRole.should.be.a('function');

          user.notify.should.be.a('function');
          user.getGravatar.should.be.a('function');
          user.completeProfile.should.be.a('function');
        });

        it('user instance creates a proper gravatar url', function () {
          user.getGravatar().should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=300&d=wavatar&r=g');
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('functions setPassword, verifyPassword', function () {
        var user;
        before(function (done) {
          MWC.model.User.create({
            'username': 'testSubject47_1',
            'email': 'ostroumov3@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            user.setPassword('lalalaDaiMne3Ryblya', function (err) {
              if (err) {
                throw err;
              }
              done();
            });
          });
        });


        it('function verifyPassword returns true on correct password', function () {
          user.verifyPassword('lalalaDaiMne3Ryblya').should.equal(true);
        });

        it('function verifyPassword returns false on wrong password', function () {
          user.verifyPassword('sukapadla_Rozovi#Rassvet_SukePadle_DaliMnogoLet').should.equal(false);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('function invalidateSession', function () {
        var user;
        before(function (done) {
          MWC.model.User.create({
            'username': 'testSubject47_2',
            'email': 'ostroumov_3@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            userCreated.invalidateSession(function (err2) {
              if (err2) {
                throw err2;
              }
              MWC.model.User.findOne({'username': 'testSubject47_2'}, function (err3, userFound) {
                if (err3) {
                  throw err3;
                }
                user = userFound;
                done();
              });
            });
          });
        });

        it('changes the apiKey', function () {
          var test = (user.apiKey === 'lalalaDaiMne3Ryblya');
          test.should.equal(false);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('function hasRole', function () {
        var user;
        before(function (done) {
          MWC.model.User.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru',
            'roles': 'role1'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('returns true if role assigned', function () {
          user.hasRole('role1').should.be.true;
        });

        it('returns false if role is not assigned', function () {
          user.hasRole('role2').should.be.false;
        });
        after(function (done) {
          user.remove(done);
        });
      });

      describe('function grantRole', function () {
        var userWithRole;
        before(function (done) {
          async.waterfall(
            [
              function (cb) {
                MWC.model.User.create({
                  'username': 'test888',
                  'email': 'ostroumov@teksi.ru'
                }, cb);
              },
              function (aaa, cb) {
                MWC.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  userFound.grantRole('role2', function (err) {
                    cb(err, true);
                  });
                });
              },
              function (granted, cb) {
                MWC.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  cb(err, userFound);
                });
              }
            ], function (err, userFound) {
              userWithRole = userFound;
              if (err) {
                throw err;
              }

              done();
            });
        });

        it('grants assigned role', function () {
          userWithRole.hasRole('role2').should.be.true;
        });

        after(function (done) {
          userWithRole.remove(done);
        });
      });

      describe('function revokeRole', function () {
        var userWithOutRole;
        before(function (done) {
          async.waterfall(
            [
              function (cb) {
                MWC.model.User.create({
                  'username': 'test888',
                  'email': 'ostroumov@teksi.ru',
                  'roles': ['role1', 'role2']
                }, cb);
              },
              function (aaa, cb) {
                MWC.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  userFound.revokeRole('role2', function (err) {
                    cb(err, true);
                  });
                });
              },
              function (granted, cb) {
                MWC.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  cb(err, userFound);
                });
              }
            ], function (err, userFound) {
              userWithOutRole = userFound;
              if (err) {
                throw err;
              }
              done();
            });
        });
        it('revokeRole leaved other roles intact', function () {
          userWithOutRole.hasRole('role1').should.be.true;
        });
        it('revokeRole removed desired role', function () {
          userWithOutRole.hasRole('role2').should.be.false;
        });

        after(function (done) {
          userWithOutRole.remove(done);
        });
      });

      describe('function notify', function () {
        var user,
          messageObj;
        before(function (done) {
          MWC.model.User.create({
            'username': 'test888',
            'email': 'ostroumov' + Math.floor(Math.random() * 100) + '@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;

            setTimeout(function () {
              user.notify('Hello!');
            }, 300);

            MWC.on('notify:all', function (message) {
              messageObj = message;
              done();
            });
          });
        });

        it('makes mwc core emit events with message created properly', function () {
          messageObj.user.should.eql(user);
          messageObj.message.should.be.equal('Hello!');
        });

        it('throws errors for empty arguments', function () {
          (function () {
            user.notify();
          }).should.throw('Function User.notify([channelNameString],messageObj) has wrond arguments!');
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('completeProfile for uncompleted profile', function () {
        var user, userCompleted;
        before(function (done) {
          MWC.model.User.create({
            'email': 'emptyness@teksi.ru',
            'profileComplete': false,
            'emailVerified': true
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            userCreated.completeProfile('Anatolij', 'thePerpendicularReality', function (err1) {
              if (err1) {
                throw err1;
              }
              MWC.model.User.findOneByLoginOrEmail('Anatolij', function (err2, userFound) {
                if (err2) {
                  throw err2;
                }
                userCompleted = userFound;
                done();
              });
            });
          });
        });

        it('it finds the user we created', function () {
          userCompleted._id.should.eql(user._id);
        });

        it('set profileComplete to TRUE', function () {
          userCompleted.profileComplete.should.be.true;
        });

        it('sets the username properly', function () {
          userCompleted.username.should.be.equal('Anatolij');
        });

        it('sets the password properly', function () {
          userCompleted.verifyPassword('thePerpendicularReality').should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('completeProfile for completed profile', function () {
        var user, errorThrown;
        before(function (done) {
          MWC.model.User.create({
            'email': 'emptyness@teksi.ru',
            'profileComplete': true,
            'emailVerified': true
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            userCreated.completeProfile('Anatolij', 'thePerpendicularReality', function (err1) {
              errorThrown = err1;
              done();
            });
          });
        });

        it('throws error properly', function () {
          errorThrown.should.be.instanceOf(Error);
          errorThrown.message.should.be.equal('Account is completed!');
        });

        after(function (done) {
          user.remove(done);
        });
      });
    });

  });
});
