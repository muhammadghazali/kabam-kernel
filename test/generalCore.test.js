/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');

var MWC = mwcCore(config);

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
      MWC.model.should.be.a('object');
    });

    it('exposes mongoose model of users', function() {
      MWC.model.Users.should.be.a('function');
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
      MWC.model.Users.find.should.be.a('function');
    });
    it('exposes function findOne',function(){
      MWC.model.Users.findOne.should.be.a('function');
    });
    it('exposes function findOneByLoginOrEmail',function(){
      MWC.model.Users.findOneByLoginOrEmail.should.be.a('function');
    });
    it('exposes function findOneByApiKey',function(){
      MWC.model.Users.findOneByApiKey.should.be.a('function');
    });
    it('exposes function count',function(){
      MWC.model.Users.count.should.be.a('function');
    });
    it('exposes function remove',function(){
      MWC.model.Users.remove.should.be.a('function');
    });
    it('exposes function create',function(){
      MWC.model.Users.create.should.be.a('function');
    });

    it('exposes function getByRole',function(){
      MWC.model.Users.getByRole.should.be.a('function');
    });

    it('exposes function signUp',function(){
      MWC.model.Users.signUp.should.be.a('function');
    });

    it('exposes function findOneByApiKeyAndVerify',function(){
      MWC.model.Users.findOneByApiKeyAndVerify.should.be.a('function');
    });

    it('exposes function findOneByApiKeyAndResetPassword',function(){
      MWC.model.Users.findOneByApiKeyAndResetPassword.should.be.a('function');
    });

    it('exposes function processOAuthProfile',function(){
      MWC.model.Users.processOAuthProfile.should.be.a('function');
    });


    describe('finders',function(){
      var usersFound;
      before(function (done) {
        MWC.model.Users.create({
          'username': 'testSubject47111',
          'email': 'ostroumov4@teksi.ru',
          'apiKey': 'vseBydetHorosho'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          async.parallel({
            'byLogin':function(cb){
              MWC.model.Users.findOneByLoginOrEmail('testSubject47111',cb);
            },
            'byEmail':function(cb){
              MWC.model.Users.findOneByLoginOrEmail('ostroumov4@teksi.ru',cb);
            },
            'byApiKey':function(cb){
              MWC.model.Users.findOneByApiKey('vseBydetHorosho',cb);
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

    describe('signUp',function(){
      var user;
      before(function(done){
        MWC.model.Users.signUp('johndoe','johndoe@example.org','waterfall',function(err,userCreated){
          if(err) throw err;
          user=userCreated;
          done();
        });
      });
      it('creates user with desired username',function(){
        user.username.should.be.equal('johndoe');
      });
      it('creates user with desired email',function(){
        user.email.should.be.equal('johndoe@example.org');
      });

      it('creates user with LOOOONG salt and password',function(){
        user.apiKey.length.should.be.above(63);
        user.apiKey.length.should.be.above(63);
      });

      it('creates user with desired password',function(){
        user.verifyPassword('waterfall').should.be.true;
        user.verifyPassword('fiflesAndFuffles').should.be.false;
      });

      it('creates user with apiKey present',function(){
        user.apiKey.length.should.be.above(5);
      });

      it('creates user with actual apiKey',function(){
        var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
        ago.should.be.below(10*1000); //10 seconds
      });

      it('creates user with emailVerified being FALSE',function(){
        user.emailVerified.should.be.false;
      });

      it('creates ordinary user, not root',function(){
        user.root.should.be.false;
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('signUpByEmailOnly',function(){
      var user;
      before(function(done){
        MWC.model.Users.signUpByEmailOnly('johndoe@example.org',function(err,userCreated){
          if(err) throw err;
          user=userCreated;
          done();
        });
      });

      it('creates user without username',function(){
        should.not.exist(user.username);
      });

      it('creates user with LOOOONG salt and password',function(){
        user.apiKey.length.should.be.above(63);
        user.apiKey.length.should.be.above(63);
      });

      it('creates user with apiKey present',function(){
        user.apiKey.length.should.be.above(5);
      });

      it('creates user with actual apiKey',function(){
        var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
        ago.should.be.below(10*1000); //10 seconds
      });

      it('creates user with emailVerified being TRUE',function(){
        user.emailVerified.should.be.true;
      });

      it('creates ordinary user, not root',function(){
        user.root.should.be.false;
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('findOneByApiKeyAndVerify',function(){
      var user,userBeingActivated;
      before(function (done) {
        MWC.model.Users.create({
          'username': 'oneByApiKey',
          'email': 'oneByApiKey@teksi.ru',
          'apiKey': 'vseBydetHoroshooneByApiKey',
          'emailVerified':false,
          'apiKeyCreatedAt':new Date()
        }, function (err, userCreated) {
          if(err) throw err;
          user=userCreated;
          MWC.model.Users.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey',function(err,userActivated){
            userBeingActivated=userActivated;
            done();
          });
        });
      });

      it('it finds the user we created',function(){
        userBeingActivated._id.should.eql(user._id);
      });

      it('set emailVerified to TRUE',function(){
        userBeingActivated.emailVerified.should.be.true;
      });

      after(function (done) {
        user.remove(done);
      });
    });

    describe('findOneByApiKeyAndResetPassword',function(){
      var user,userWithPasswordReseted;
      before(function(done){
        async.waterfall([

          function (cb) {
            MWC.model.Users.create({
              'username': 'iForgotMyPassWordIamStupid',
              'email': 'iForgotMyPassWordIamStupid@teksi.ru',
              'apiKey': 'iForgotMyPassWordIamStupid1111',
              'emailVerified': true,
              'apiKeyCreatedAt': new Date()
            }, function (err, userCreated) {
              user=userCreated;
              userCreated.setPassword('lalala',function(err){
                cb(err, userCreated);
              });
            });
          },
          function(user1,cb){
            MWC.model.Users.findOneByApiKeyAndResetPassword('iForgotMyPassWordIamStupid1111','lalala2',function(err1,userChanged){
              if(err1){
                cb(err1);
              } else {
                cb(null,userChanged);
              }
            });
          }
        ],
          function (err,userChanged2) {
            if (err) {
              throw err;
            }
            userWithPasswordReseted=userChanged2;
            done();
          });
      });

      it('it finds the user we created',function(){
        userWithPasswordReseted._id.should.eql(user._id);
      });

      it('and the user have new password',function(){
        userWithPasswordReseted.verifyPassword('lalala1').should.be.false;
        userWithPasswordReseted.verifyPassword('lalala2').should.be.true;
      });

      after(function (done) {
        user.remove(done);
      });
    });

    describe('processOAuthProfile for user in database',function(){
      var user,userFound;
      before(function(done){
        MWC.model.Users.signUp('johnDoe','johndoe@example.org','suzan123', function(err,userCreated){
          if(err) throw err;
          user=userCreated;
          MWC.model.Users.processOAuthProfile('johndoe@example.org',function(error,userFromProfile){
            if(error) throw error;
            userFound=userFromProfile;
            done();
          });

        });
      });

      it('finds exactly the user we need',function(){
        user._id.should.eql(userFound._id);
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('processOAuthProfile for user NOT in database',function(){
      it('creates a uncompleted profile for this user');
    });
  });



  describe('Testing mwc_core mongoose model one instance of user:', function () {
    describe('general function are callable', function () {
      var user;

      before(function (done) {
        MWC.model.Users.create({
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
        user.completeProfile.should.be.a('function');
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
        MWC.model.Users.create({
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

    describe('function invalidateSession', function () {
      var user;
      before(function (done) {
        MWC.model.Users.create({
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
            MWC.model.Users.findOne({'username': 'testSubject47_2'}, function (err3, userFound) {
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

    describe('function hasRole',function(){
      var user;
      before(function(done){
        MWC.model.Users.create({
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

    describe('function grantRole',function(){
      var userWithRole;
      before(function(done){
        async.waterfall(
          [
            function(cb){
              MWC.model.Users.create({
                'username': 'test888',
                'email': 'ostroumov@teksi.ru',
                'apiKey':'lalala1'
              },cb);
            },
            function(aaa,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                userFound.grantRole('role2',function(err){
                  cb(err,true);
                });
              });
            },
            function(granted,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                cb(err,userFound);
              });
            }
          ],function(err,userFound){
            userWithRole = userFound;
            if(err) throw err;
            done();
          });
      });

      it('grants assigned role',function(){
        userWithRole.hasRole('role2').should.be.true;
      });

      after(function(done){
        userWithRole.remove(done);
      });
    });

    describe('function revokeRole',function(){
      var userWithOutRole;
      before(function(done){
        async.waterfall(
          [
            function(cb){
              MWC.model.Users.create({
                'username': 'test888',
                'email': 'ostroumov@teksi.ru',
                'apiKey':'lalala1',
                'roles':['role1','role2']
              },cb);
            },
            function(aaa,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                userFound.revokeRole('role2',function(err){
                  cb(err,true);
                });
              });
            },
            function(granted,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
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

    describe('function notify',function(){
      var user,
        messageObj;
      before(function(done){
        MWC.model.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1'
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

    describe('completeProfile',function(){
      var user,userCompleted;
      before(function(done){
        MWC.model.Users.create({
          'email': 'emptyness@teksi.ru',
          'apiKey':'lalala1',
          'profileComplete':false,
          'emailVerified':true
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          userCreated.completeProfile('Anatolij','thePerpendicularReality',function(err1){
            if(err1) throw err1;
            MWC.model.Users.findOneByLoginOrEmail('Anatolij',function(err2,userFound){
              if(err2) throw err2;
              userCompleted=userFound;
              done();
            });
          });
        });
      });

      it('it finds the user we created',function(){
        userCompleted._id.should.eql(user._id);
      });

      it('set profileComplete to TRUE',function(){
        userCompleted.profileComplete.should.be.true;
      });

      it('sets the username properly', function(){
        userCompleted.username.should.be.equal('Anatolij');
      });

      it('sets the password properly', function(){
        userCompleted.verifyPassword('thePerpendicularReality').should.be.true;
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

    it('adds the extending core function to array of MWC._extendCoreFunctions', function() {
      MWC._extendCoreFunctions.should.be.an.instanceOf(Array);
      MWC._extendCoreFunctions.should.include(extendCoreFunction);
    });

    it('actually adds new functions to #MWC',function(){
      MWC.sum.should.be.a('function');
      MWC.sum(2,2).should.equal(4);
    });
  });

  describe('#MWC.extendModel()',function(){
    it('adds the extending model function to array of #MWC._additionalModels',function(){
      MWC._additionalModels.should.includeEql({'name':'Cats','initFunction':extendModelFunction});
    });
    it('adds the model of "Cats" to #MWC.model.Cats',function(){
      MWC.model.Cats.should.be.a('function');
    });
    describe('and the "Cats" model looks like mongoose model',function(){
      it('exposes function find',function(){
        MWC.model.Cats.find.should.be.a('function');
      });
      it('exposes function findOne',function(){
        MWC.model.Cats.findOne.should.be.a('function');
      });
      it('exposes function count',function(){
        MWC.model.Cats.count.should.be.a('function');
      });
      it('exposes function remove',function(){
        MWC.model.Cats.remove.should.be.a('function');
      });
      it('exposes function create',function(){
        MWC.model.Cats.create.should.be.a('function');
      });
    });
  });

  describe('#MWC.extendApp()',function(){
    it('adds the desired functions to MWC._extendAppFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC._extendAppFunctions.should.be.an.instanceOf(Array);
    });
    it('it set extendAppParametersFunction1 to development environment',function(){
      MWC._extendAppFunctions.should.includeEql({'environment':'development', 'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction1 to staging environment',function(){
      MWC._extendAppFunctions.should.includeEql({'environment':'staging',     'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction2 to development environment',function(){
      MWC._extendAppFunctions.should.includeEql({'environment':'development', 'settingsFunction':extendAppParametersFunction2});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC._extendAppFunctions.should.includeEql({'environment':'production',  'settingsFunction':extendAppParametersFunction3});
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
    it('adds the desired functions to MWC._extendMiddlewaresFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC._extendMiddlewaresFunctions.should.be.an.instanceOf(Array);
    });

    it('it set extendAppMiddlewareFunction1 to all environments and path /',function(){
      MWC._extendMiddlewaresFunctions.should.includeEql({'path':'/', 'SettingsFunction':extendAppMiddlewareFunction1});
    });
    it('it set extendAppParametersFunction2 to staging environment',function(){
      MWC._extendMiddlewaresFunctions.should.includeEql({'path':'/', environment:'staging','SettingsFunction':extendAppMiddlewareFunction2});
    });
    it('it set extendAppParametersFunction3 to staging environment',function(){
      MWC._extendMiddlewaresFunctions.should.includeEql({'path':'/', environment:'staging', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC._extendMiddlewaresFunctions.should.includeEql({'path':'/', environment:'production', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppMiddlewareFunction3 to development environment and path /middleware3Path',function(){
      MWC._extendMiddlewaresFunctions.should.includeEql({'path':'/middleware3Path', environment:'development', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppMiddlewareFunction4 to development environment and path /middleware4Path',function(){
      MWC._extendMiddlewaresFunctions.should.includeEql({environment:'development','path':'/middleware4Path', 'SettingsFunction':extendAppMiddlewareFunction4});
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

    it('adds the desired functions to MWC._extendRoutesFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC._extendRoutesFunctions.should.be.an.instanceOf(Array);
      MWC._extendRoutesFunctions.should.includeEql(extendRoutesFunction);
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
      it('it adds the extending core function to array of #MWC._extendCoreFunctions', function () {
        MWC._extendCoreFunctions.should.be.an.instanceOf(Array);
        MWC._extendCoreFunctions.should.include(extendCoreFunctionPlugin);
      });

      it('it actually adds new functions to #MWC.core', function () {
        MWC.mul.should.be.a('function');
        MWC.mul(3, 2).should.equal(6);
      });
    });

    describe('extendModel from plugin', function() {
      it('adds the extending model function to array of #MWC._additionalModels',function(){
        MWC._additionalModels.should.includeEql({'name':'Dogs','initFunction':extendModelFunctionPlugin});
      });
      it('adds the model of "Dogs" to #MWC.model.Dogs',function(){
        MWC.model.Dogs.should.be.a('function');
      });
      describe('and the "Dogs" model looks like mongoose model',function(){
        it('exposes function find',function(){
          MWC.model.Dogs.find.should.be.a('function');
        });
        it('exposes function findOne',function(){
          MWC.model.Dogs.findOne.should.be.a('function');
        });
        it('exposes function count',function(){
          MWC.model.Dogs.count.should.be.a('function');
        });
        it('exposes function remove',function(){
          MWC.model.Dogs.remove.should.be.a('function');
        });
        it('exposes function create',function(){
          MWC.model.Dogs.create.should.be.a('function');
        });
      });
    });

    describe('extendApp from plugin', function () {

      it('it adds the desired functions to #MWC._extendAppFunctions', function () {
        if (typeof process.env.NODE_ENV !== 'undefined') {
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC._extendAppFunctions.should.be.an.instanceOf(Array);
      });

      it('it set extendAppParametersFunctionPlugin to all environments', function () {
        MWC._extendAppFunctions.should.includeEql({'settingsFunction': extendAppParametersFunctionPlugin});
      });

      it('it works', function () {
        MWC.app.get('extendAppParametersFunctionPlugin').should.equal('extended111');
      });
    });

    describe('extendMiddlewares from plugin',function() {
      it('adds the desired functions to MWC._extendMiddlewaresFunctions',function(){
        if(typeof process.env.NODE_ENV !== 'undefined'){
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC._extendMiddlewaresFunctions.should.be.an.instanceOf(Array);
      });

      it('it set extendAppMiddlewareFunctionPlugin to all environments and path "/"',function(){
        MWC._extendMiddlewaresFunctions.should.includeEql({'path':'/', 'SettingsFunction':extendAppMiddlewareFunctionPlugin});
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

      it('adds the desired functions to MWC._extendRoutesFunctions',function(){
        if(typeof process.env.NODE_ENV !== 'undefined'){
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC._extendRoutesFunctions.should.be.an.instanceOf(Array);
        MWC._extendRoutesFunctions.should.includeEql(extendRoutesFunctionPlugin);
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
