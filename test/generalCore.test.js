/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');

var MWC = new mwcCore(config);

/*
 * Extending core
 */
var extendCoreFunction = function(core){
  core.sum=function(a,b){
    return (a+b);
  };
};

MWC.extendCore(extendCoreFunction);

/*
 * Extending model
 */

var extendModelFunction = function(mongoose,config){
  var CatsSchema = new mongoose.Schema({
    'nickname':String
  });

  CatsSchema.index({
    nickname: 1
  });

  return mongoose.model('cats', CatsSchema);
};

MWC.extendModel('Cats',extendModelFunction);
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

MWC.extendApp(['development', 'staging'], extendAppParametersFunction1);
MWC.extendApp('development', extendAppParametersFunction2);
MWC.extendApp('production', extendAppParametersFunction3);
/*
 * Extending middlewares
 */
var extendAppMiddlewareFunction1=function(core){
  return function(request,response,next){
    response.setHeader('middleware1','middleware1');
    next();
  };
};

var extendAppMiddlewareFunction2=function(core){
  return function(request,response,next){
    response.setHeader('middleware2','middleware2');
    next();
  };
};

var extendAppMiddlewareFunction3=function(core){
  return function(request,response,next){
    response.setHeader('middleware3','middleware3');
    next();
  };
};

var extendAppMiddlewareFunction4=function(core){
  return function(request,response,next){
    response.setHeader('middleware4','middleware4');
    next();
  };
};

MWC.extendMiddlewares(extendAppMiddlewareFunction1);
MWC.extendMiddlewares('staging',extendAppMiddlewareFunction2);
MWC.extendMiddlewares(['staging','production'],extendAppMiddlewareFunction3);
MWC.extendMiddlewares(['development'],'/middleware3Path',extendAppMiddlewareFunction3);
MWC.extendMiddlewares('development','/middleware4Path',extendAppMiddlewareFunction4);

/* Adding custom routes
 *
 */

var extendRoutesFunction = function (core){
  core.app.get('/someRoute',function (req,res){
    res.send('HI');
  });
};
MWC.extendRoutes(extendRoutesFunction);

//load plugin as an object

var extendCoreFunctionPlugin = function (core){
  core.mul=function(a,b){
    return a*b;
  };
};

var extendAppParametersFunctionPlugin = function (core){
  core.app.set('extendAppParametersFunctionPlugin','extended111');
};

var extendAppMiddlewareFunctionPlugin = function (core){
  return function(request,response,next){
    response.setHeader('extendAppMiddlewareFunctionPlugin','OK');
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

MWC.usePlugin({
  'extendCore': extendCoreFunctionPlugin,
  'extendModel':{'Dogs':extendModelFunctionPlugin},
  'extendApp': extendAppParametersFunctionPlugin,
  'extendMiddlewares': extendAppMiddlewareFunctionPlugin,
  'extendRoutes': extendRoutesFunctionPlugin
});


//create and start this application
MWC.listen(3000);

describe('mwcCore', function() {
  describe('Testing exposed objects of running mwcCore', function() {

    it('can emit and listen to events', function() {
      MWC.emit.should.be.a('function');
      MWC.on.should.be.a('function');
    });

    it('exposes redis client', function() {
      MWC.redisClient.should.be.a('object');
      MWC.redisClient.set.should.be.a('function');
      MWC.redisClient.get.should.be.a('function');
      MWC.redisClient.info.should.be.a('function');
      MWC.redisClient.auth.should.be.a('function');
    });

    it('exposes mongoose model',function(){
      MWC.MODEL.should.be.a('object');
    });

    it('exposes mongoose model of users', function() {
      MWC.MODEL.Users.should.be.a('function');
    });

    it('exposes an ExpressJS application', function() {
      MWC.app.should.be.a('function');
      MWC.app.get('port').should.equal(3000);
      MWC.app.listen.should.be.a('function');
      MWC.app.use.should.be.a('function');
      MWC.app.get.should.be.a('function');
      MWC.app.post.should.be.a('function');
      MWC.app.delete.should.be.a('function');
    });

    it('throws error when we try to extend readied application', function() {

      (function() {
        MWC.extendCore(function () {
          throw new Error('Core was extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function() {
        MWC.extendApp(['development', 'staging'], function() {
          throw new Error('Core app parameters were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function() {
        MWC.extendMiddlewares(['development', 'staging'], function() {
          throw new Error('Core app middlewares were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function() {
        MWC.extendRoutes(function() {
          throw new Error('Core app routes were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function() {
        MWC.usePlugin('mwc_plugin_make_suicide_while_punching_wall_on_high_speed');
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

    });

    it('setted the "prepared" property to true', function() {
      MWC.prepared.should.be.true;
    });

  });

  describe('Testing mwc_core event emiting system', function() {
    var error,
      message;

    before(function(done) {
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

    it('emits and catches events by itself', function() {
      should.not.exist(error);
      message.should.be.equal('pong');
    });

  });
  describe('Testing mwc_core mongoose model of users:', function(){
    it('exposes function find',function(){
      MWC.MODEL.Users.find.should.be.a('function');
    });
    it('exposes function findOne',function(){
      MWC.MODEL.Users.findOne.should.be.a('function');
    });
    it('exposes function findOneByLoginOrEmail',function(){
      MWC.MODEL.Users.findOneByLoginOrEmail.should.be.a('function');
    });
    it('exposes function findOneByApiKey',function(){
      MWC.MODEL.Users.findOneByApiKey.should.be.a('function');
    });
    it('exposes function count',function(){
      MWC.MODEL.Users.count.should.be.a('function');
    });
    it('exposes function remove',function(){
      MWC.MODEL.Users.remove.should.be.a('function');
    });
    it('exposes function create',function(){
      MWC.MODEL.Users.create.should.be.a('function');
    });
    it('exposes function getByRole',function(){
      MWC.MODEL.Users.getByRole.should.be.a('function');
    });
  });
  describe('Testing mwc_core mongoose model of users finders',function(){
    var usersFound;
    before(function (done) {
      MWC.MODEL.Users.create({
        'username': 'testSubject47111',
        'email': 'ostroumov4@teksi.ru',
        'apiKey': 'vseBydetHorosho'
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }
        async.parallel({
          'byLogin':function(cb){
            MWC.MODEL.Users.findOneByLoginOrEmail('testSubject47111',cb);
          },
          'byEmail':function(cb){
            MWC.MODEL.Users.findOneByLoginOrEmail('ostroumov4@teksi.ru',cb);
          },
          'byApiKey':function(cb){
            MWC.MODEL.Users.findOneByApiKey('vseBydetHorosho',cb);
          },
          'created':function(cb){
            cb(null,userCreated);
          }
        },function(err,res){
          if(err) throw err;
          usersFound=res;
          done();
        });
      });
    });

    it('we created correct user to be sure',function(){
      usersFound.created.username.should.be.equal('testSubject47111');
      usersFound.created.email.should.be.equal('ostroumov4@teksi.ru');
      usersFound.created.apiKey.should.be.equal('vseBydetHorosho');
    });

    it('findOneByLoginOrEmail works for login',function(){
      usersFound.created._id.should.eql(usersFound.byLogin._id);
    });

    it('findOneByLoginOrEmail works for Email',function(){
      usersFound.created._id.should.eql(usersFound.byEmail._id);
    });

    it('findOneByApiKey works',function(){
      usersFound.created._id.should.eql(usersFound.byApiKey._id);
    });

    after(function (done) {
      usersFound.created.remove(done);
    });
  });
  describe('Testing mwc_core mongoose model one instance of user:', function () {
    describe('general function are callable', function () {
      var user;

      before(function (done) {
        MWC.MODEL.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1'
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
      });

      it('user instance creates a proper gravatar url', function () {
        user.getGravatar().should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=300&d=wavatar&r=g');
      });

      after(function (done) {
        user.remove(done)
      });
    });
    describe('functions setPassword, verifyPassword', function () {
      var user;
      before(function (done) {
        MWC.MODEL.Users.create({
          'username': 'testSubject47_1',
          'email': 'ostroumov3@teksi.ru',
          'apiKey':'lalala1_1'
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
        user.remove(done)
      });
    });
    describe('functions invalidateSession', function () {
      var user;
      before(function (done) {
        MWC.MODEL.Users.create({
          'username': 'testSubject47_2',
          'email': 'ostroumov_3@teksi.ru',
          'apiKey': 'lalalaDaiMne3Ryblya'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          userCreated.invalidateSession(function (err2) {
            if (err2) {
              throw err2;
            }
            MWC.MODEL.Users.findOne({'username': 'testSubject47_2'}, function (err3, userFound) {
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
        user.remove(done)
      });
    });
    describe('functions hasRole',function(){
      var user;
      before(function(done){
        MWC.MODEL.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1',
          'roles':'role1'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          done();
        });
      });

      it('returns true if role assigned',function(){
        user.hasRole('role1').should.be.true;
      });

      it('returns false if role is not assigned',function(){
        user.hasRole('role2').should.be.false;
      });
      after(function(done){
        user.remove(done);
      });
    });

    describe('functions grantRole',function(){
      var userWithRole;
      before(function(done){
        async.waterfall(
          [
            function(cb){
              MWC.MODEL.Users.create({
                'username': 'test888',
                'email': 'ostroumov@teksi.ru',
                'apiKey':'lalala1'
              },cb);
            },
            function(aaa,cb){
              MWC.MODEL.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                userFound.grantRole('role2',function(err){
                  cb(err,true);
                });
              });
            },
            function(granted,cb){
              MWC.MODEL.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                cb(err,userFound);
              });
            }
          ],function(err,userFound){
            userWithRole = userFound;
            if(err) throw err;
            done();
          });
      });

      it('grantRole assigned role',function(){
        userWithRole.hasRole('role2').should.be.true;
      });

      after(function(done){
        userWithRole.remove(done);
      });
    });

    describe('functions revokeRole',function(){
      var userWithOutRole;
      before(function(done){
        async.waterfall(
          [
            function(cb){
              MWC.MODEL.Users.create({
                'username': 'test888',
                'email': 'ostroumov@teksi.ru',
                'apiKey':'lalala1',
                'roles':['role1','role2']
              },cb);
            },
            function(aaa,cb){
              MWC.MODEL.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                userFound.revokeRole('role2',function(err){
                  cb(err,true);
                });
              });
            },
            function(granted,cb){
              MWC.MODEL.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                cb(err,userFound);
              });
            }
          ],function(err,userFound){
            userWithOutRole = userFound;
            if(err) throw err;
            done();
          });
      });
      it('revokeRole leaved other roles intact',function(){
        userWithOutRole.hasRole('role1').should.be.true;
      });
      it('revokeRole removed desired role',function(){
        userWithOutRole.hasRole('role2').should.be.false;
      });

      after(function(done){
        userWithOutRole.remove(done);
      });
    });

    describe('testing user notify',function(){
      var user,
        messageObj;
      before(function(done){
        MWC.MODEL.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1',
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;

          setTimeout(function(){
            user.notify('Hello!');
          },300);

          MWC.on('notify',function(message){
            messageObj=message;
            done();
          });
        });
      });

      it('makes mwc core emit events with message created properly',function(){
        messageObj.type.should.be.equal('text');
        messageObj.user.should.eql(user);
        messageObj.message.should.be.equal('Hello!');
      });

      after(function(done){
        user.remove(done);
      });
    });
  });
  describe('Testing mwc_core express application', function() {
    it('it exposes a #MWC.app object',function(){
      MWC.app.should.be.a('function');
    });
  });

  describe('#MWC.extendCore()', function() {

    it('adds the extending core function to array of MWC.setCoreFunctions', function() {
      MWC.extendCoreFunctions.should.be.an.instanceOf(Array);
      MWC.extendCoreFunctions.should.include(extendCoreFunction);
    });

    it('actually adds new functions to #MWC',function(){
      MWC.sum.should.be.a('function');
      MWC.sum(2,2).should.equal(4);
    });
  });

  describe('#MWC.extendModel()',function(){
    it('adds the extending model function to array of #MWC.additionalModels',function(){
      MWC.additionalModels.should.includeEql({'name':'Cats','initFunction':extendModelFunction});
    });
    it('adds the model of "Cats" to #MWC.MODEL.Cats',function(){
      MWC.MODEL.Cats.should.be.a('function');
    });
    describe('and the "Cats" model looks like mongoose model',function(){
      it('exposes function find',function(){
        MWC.MODEL.Cats.find.should.be.a('function');
      });
      it('exposes function findOne',function(){
        MWC.MODEL.Cats.findOne.should.be.a('function');
      });
      it('exposes function count',function(){
        MWC.MODEL.Cats.count.should.be.a('function');
      });
      it('exposes function remove',function(){
        MWC.MODEL.Cats.remove.should.be.a('function');
      });
      it('exposes function create',function(){
        MWC.MODEL.Cats.create.should.be.a('function');
      });
    });
  });

  describe('#MWC.extendApp()',function(){
    it('adds the desired functions to MWC.extendAppFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.extendAppFunctions.should.be.an.instanceOf(Array);
    });
    it('it set extendAppParametersFunction1 to development environment',function(){
      MWC.extendAppFunctions.should.includeEql({'environment':'development', 'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction1 to staging environment',function(){
      MWC.extendAppFunctions.should.includeEql({'environment':'staging',     'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction2 to development environment',function(){
      MWC.extendAppFunctions.should.includeEql({'environment':'development', 'settingsFunction':extendAppParametersFunction2});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC.extendAppFunctions.should.includeEql({'environment':'production',  'settingsFunction':extendAppParametersFunction3});
    });

    it('actually works',function(){
      MWC.app.get('TempVar1').should.equal('TempVar1');
      MWC.app.get('TempVar2').should.equal('TempVar2');
      if(typeof MWC.app.get('TempVar3') !== 'undefined'){
        throw new Error('We set app parameter for wrong environment!');
      }
    });
  });

  describe('#MWC.extendMiddlewares()', function() {
    it('adds the desired functions to MWC.extendMiddlewaresFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.extendMiddlewaresFunctions.should.be.an.instanceOf(Array);
    });

    it('it set extendAppMiddlewareFunction1 to all environments and path /',function(){
      MWC.extendMiddlewaresFunctions.should.includeEql({'path':'/', 'SettingsFunction':extendAppMiddlewareFunction1});
    });
    it('it set extendAppParametersFunction2 to staging environment',function(){
      MWC.extendMiddlewaresFunctions.should.includeEql({'path':'/', environment:'staging','SettingsFunction':extendAppMiddlewareFunction2});
    });
    it('it set extendAppParametersFunction3 to staging environment',function(){
      MWC.extendMiddlewaresFunctions.should.includeEql({'path':'/', environment:'staging', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC.extendMiddlewaresFunctions.should.includeEql({'path':'/', environment:'production', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppMiddlewareFunction3 to development environment and path /middleware3Path',function(){
      MWC.extendMiddlewaresFunctions.should.includeEql({'path':'/middleware3Path', environment:'development', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppMiddlewareFunction4 to development environment and path /middleware4Path',function(){
      MWC.extendMiddlewaresFunctions.should.includeEql({environment:'development','path':'/middleware4Path', 'SettingsFunction':extendAppMiddlewareFunction4});
    });

    describe('it actually works',function(){
      var response,body;
      before(function(done){
        request.get('http://localhost:3000/middleware3Path',function (err, res, b){
          if(err) throw err;
          response=res;
          body=b;
          done();
        });
      });

      it('it starts HTTP server on port localhost:3000', function() {
        response.statusCode.should.equal(404);//this is ok
      });

      it('this server runs a ExpressJS application',function(){
        response.headers['x-powered-by'].should.be.equal('Express');
      });

      it('this application have headers needed by #MWC.extendMiddlewares',function(){
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['middleware3'].should.be.equal('middleware3');
      });
    });
  });

  describe('#MWC.extendRoutes()', function() {

    it('adds the desired functions to MWC.setAppRoutesFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.extendRoutesFunctions.should.be.an.instanceOf(Array);
      MWC.extendRoutesFunctions.should.includeEql(extendRoutesFunction);
    });

    describe('it actually works',function(){
      var response,body;
      before(function(done){
        request.get('http://localhost:3000/someRoute',function (err, res, b){
          if(err) throw err;
          response=res;
          body=b;
          done();
        });
      });

      it('it starts HTTP server on port localhost:3000', function() {
        response.statusCode.should.equal(200);
        body.should.equal('HI');
      });

      it('this server runs a ExpressJS application',function(){
        response.headers['x-powered-by'].should.be.equal('Express');
      });

      it('this application have headers needed by #MWC.extendMiddlewares',function(){
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
      });
    });
  });

  describe('#MWC.usePlugin(object)', function () {

    describe('extendCore from plugin', function () {
      it('it adds the extending core function to array of #MWC.setCoreFunctions', function () {
        MWC.extendCoreFunctions.should.be.an.instanceOf(Array);
        MWC.extendCoreFunctions.should.include(extendCoreFunctionPlugin);
      });

      it('it actually adds new functions to #MWC.core', function () {
        MWC.mul.should.be.a('function');
        MWC.mul(3, 2).should.equal(6);
      });
    });

    describe('extendModel from plugin', function() {
      it('adds the extending model function to array of #MWC.additionalModels',function(){
        MWC.additionalModels.should.includeEql({'name':'Dogs','initFunction':extendModelFunctionPlugin});
      });
      it('adds the model of "Dogs" to #MWC.MODEL.Dogs',function(){
        MWC.MODEL.Dogs.should.be.a('function');
      });
      describe('and the "Dogs" model looks like mongoose model',function(){
        it('exposes function find',function(){
          MWC.MODEL.Dogs.find.should.be.a('function');
        });
        it('exposes function findOne',function(){
          MWC.MODEL.Dogs.findOne.should.be.a('function');
        });
        it('exposes function count',function(){
          MWC.MODEL.Dogs.count.should.be.a('function');
        });
        it('exposes function remove',function(){
          MWC.MODEL.Dogs.remove.should.be.a('function');
        });
        it('exposes function create',function(){
          MWC.MODEL.Dogs.create.should.be.a('function');
        });
      });
    });

    describe('extendApp from plugin', function () {

      it('it adds the desired functions to #MWC.extendAppFunctions', function () {
        if (typeof process.env.NODE_ENV !== 'undefined') {
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC.extendAppFunctions.should.be.an.instanceOf(Array);
      });

      it('it set extendAppParametersFunctionPlugin to all environments', function () {
        MWC.extendAppFunctions.should.includeEql({'settingsFunction': extendAppParametersFunctionPlugin});
      });

      it('it works', function () {
        MWC.app.get('extendAppParametersFunctionPlugin').should.equal('extended111');
      });
    });

    describe('extendMiddlewares from plugin',function() {
      it('adds the desired functions to MWC.extendMiddlewaresFunctions',function(){
        if(typeof process.env.NODE_ENV !== 'undefined'){
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC.extendMiddlewaresFunctions.should.be.an.instanceOf(Array);
      });

      it('it set extendAppMiddlewareFunctionPlugin to all environments and path "/"',function(){
        MWC.extendMiddlewaresFunctions.should.includeEql({'path':'/', 'SettingsFunction':extendAppMiddlewareFunctionPlugin});
      });

      describe('it actually works',function(){
        var response,body;
        before(function(done){
          request.get('http://localhost:3000/someRoute',function (err, res, b){
            if(err) throw err;
            response=res;
            body=b;
            done();
          });
        });

        it('it starts HTTP server on port localhost:3000', function() {
          response.statusCode.should.equal(200);
          body.should.equal('HI');
        });

        it('this server runs a ExpressJS application',function(){
          response.headers['x-powered-by'].should.be.equal('Express');
        });

        it('this  application have headers needed by #MWC.extendMiddlewares',function(){
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });
      });
    });

    describe('extendRoutes from plugin',function(){

      it('adds the desired functions to MWC.setAppRoutesFunctions',function(){
        if(typeof process.env.NODE_ENV !== 'undefined'){
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC.extendRoutesFunctions.should.be.an.instanceOf(Array);
        MWC.extendRoutesFunctions.should.includeEql(extendRoutesFunctionPlugin);
      });

      describe('it actually works',function(){
        var response,body;
        before(function(done){
          request.get('http://localhost:3000/newPlugin',function (err, res, b){
            if(err) throw err;
            response=res;
            body=b;
            done();
          });
        });

        it('it starts HTTP server on port localhost:3000', function() {
          response.statusCode.should.equal(200);
        });

        it('this server runs a ExpressJS application',function(){
          response.headers['x-powered-by'].should.be.equal('Express');
        });

        it('this application have headers needed by #MWC.extendMiddlewares',function(){
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });

        it('this application serves routes desired', function(){
          response.statusCode.should.equal(200);
          body.should.equal('New plugin is installed as object');
        });
      });

    });
  });

  describe('#MWC.listen(portNumber)', function() {
    var response,body;
    before(function(done){
      request.get('http://localhost:3000/someRoute',function (err, res, b){
        if(err) throw err;
        response=res;
        body=b;
        done();
      });
    });

    it('it starts HTTP server on port localhost:3000', function() {
      response.statusCode.should.equal(200);
      body.should.equal('HI');
    });

    it('this server runs a ExpressJS application',function(){
      response.headers['x-powered-by'].should.be.equal('Express');
    });

    it('this application have headers needed by #MWC.extendMiddlewares',function(){
      response.headers['middleware1'].should.be.equal('middleware1');
      response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
    });
  });

});
