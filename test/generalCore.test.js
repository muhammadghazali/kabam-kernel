/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request'),
  blanket = require('blanket');

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

MWC.setAppParameters(['development', 'staging'], extendAppParametersFunction1);
MWC.setAppParameters('development', extendAppParametersFunction2);
MWC.setAppParameters('production', extendAppParametersFunction3);
/*
 * Extending middlewares
 */
var extendAppMiddlewareFunction1=function(core){
  return function(request,response,next){
    response.setHeader('middleware1','middleware1');
    next();
  }
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

MWC.setAppMiddlewares(extendAppMiddlewareFunction1);
MWC.setAppMiddlewares('staging',extendAppMiddlewareFunction2);
MWC.setAppMiddlewares(['staging','production'],extendAppMiddlewareFunction3);
MWC.setAppMiddlewares(['development'],'/middleware3Path',extendAppMiddlewareFunction3);
MWC.setAppMiddlewares('development','/middleware4Path',extendAppMiddlewareFunction4);

/* Adding custom routes
 *
 */

var extendAppRoutesFunction = function (core){
  core.app.get('/someRoute',function (req,res){
    res.send('HI');
  });
};
MWC.extendAppRoutes(extendAppRoutesFunction);

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

var extendAppRoutesFunctionPlugin = function (core) {
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
  'setAppParameters': extendAppParametersFunctionPlugin,
  'setAppMiddlewares': extendAppMiddlewareFunctionPlugin,
  'extendAppRoutes': extendAppRoutesFunctionPlugin
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

    it('exposes mongoose model of documents', function() {
      MWC.MODEL.Documents.should.be.a('function');
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
        MWC.setAppParameters(['development', 'staging'], function() {
          throw new Error('Core app parameters were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function() {
        MWC.setAppMiddlewares(['development', 'staging'], function() {
          throw new Error('Core app middlewares were extended for READIED application!');
        });
      }).should.throw('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');

      (function() {
        MWC.extendAppRoutes(function() {
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
    it('exposes function createGroup',function(){
      MWC.MODEL.Users.createGroup.should.be.a('function');
    });
    it('exposes function deleteGroup',function(){
      MWC.MODEL.Users.deleteGroup.should.be.a('function');
    });
    it('exposes function changeOwnershipOfGroup',function(){
      MWC.MODEL.Users.changeOwnershipOfGroup.should.be.a('function');
    });
    it('exposes function getGroup',function(){
      MWC.MODEL.Users.getGroup.should.be.a('function');
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
  describe('Testing mwc_core mongoose model of users group managment', function () {
    describe('createGroup', function () {

      var user, group;
      before(function (done) {
        MWC.MODEL.Users.create({
          'username': 'testSubject47',
          'email': 'ostroumov6@teksi.ru',
          'apiKey':'lalala1'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          MWC.MODEL.Users.createGroup('gosduma', userCreated.username, function (err, groupCreated) {
            group = groupCreated;
            done();
          });
        });
      });

      it('creates a group with owner needed',function(){
        group.owner.should.equal('testSubject47');
        group.name.should.equal('gosduma');
        group.members.should.be.an.instanceOf(Array);
        group.members.length.should.equal(0);
      });

      after(function (done) {
        async.waterfall([
          function(cb){
            user.remove(cb);
          },
          function(cb){
            MWC.MODEL.Users.deleteGroup(group.name,cb);
          }
        ],function(err,after){
          if(err) throw err;
          done();
        });
      });
    });
/*/
    describe('changeGroupOwnership', function () {
      var user1, user2, groupBefore,groupAfter;
      before(function (done) {
        async.parallel({
          'user1': function (cb) {
            MWC.MODEL.Users.create({
              'username': 'testSubject47',
              'email': 'ostroumov1@teksi.ru',
              'apiKey':'lalala'
            }, cb);
          },
          'user2': function (cb) {
            MWC.MODEL.Users.create({
              'username': 'testSubject47_aaa',
              'email': 'ostroumov2@teksi.ru',
              'apiKey':'lalala1'
            }, cb);
          }}, function (err, usersCreated) {
          if (err) {
            throw err;
          } else {
            if(usersCreated.user1 && usersCreated.user2){
              user1=usersCreated.user1;
              user2=usersCreated.user2;
              MWC.MODEL.Users.createGroup('gosduma',user1.username,function(err2,group){
                if(err2) throw err2;
                groupBefore=group;
                MWC.MODEL.Users.changeOwnershipOfGroup('gosduma',user2.username,function(err3){
                  if(err3) throw err3;
                  MWC.MODEL.Users.getGroup('gosduma',function(err4,group2){
                    if(err4) throw err4;
                    groupAfter=group2;
                    done();
                  });
                });
              });
            } else {
              throw new Error('Unable to create users!');
            }
          }
        });
      });

      it('creates the group with desired parameters',function(){
        groupBefore.name.should.be.equal('gosduma');
        groupBefore.owner.should.be.equal('testSubject47');
      });

      it('changes the group owner', function(){
        groupAfter.name.should.be.equal('gosduma');
        groupAfter.owner.should.be.equal('testSubject47_aaa');
      });

      after(function(done){
        async.parallel({
          'deletingUser1':function(cb){
            user1.remove(cb);
          },
          'deletingUser2':function(cb){
            user2.remove(cb);
          },
          'deletingGroup':function(cb){
            groupBefore.remove(cb);
          }
        },done);
      });
    });
//*/
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
        user.isOwnerOfGroup.should.be.a('function');
        user.isMemberOfGroup.should.be.a('function');
        user.inviteToGroup.should.be.a('function');
        user.isMemberOfGroup.should.be.a('function');
        user.removeFromGroup.should.be.a('function');
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

    describe('functions of inviteToGroup,isMemberOfGroup,removeFromGroup',function(){
//      var user,
//        isMember,
//        isNotMember,
//        Users=MWC.MODEL.Users;
//
//      before(function(done){
//        Users.create({
//          'username': 'testSubject47',
//          'email': 'ostroumov@teksi.ru'
//        }, function (err, userCreated) {
//          if(err) throw err;
//          user=userCreated;
//          userCreated.inviteToGroup('gosduma', function(err1){
//            if(err1) throw err1;
//            Users.findOne({'username':'testSubject47'},function(err2,userFound){
//              if(err2) throw err2;
//              isMember=userFound.isMemberOfGroup('gosduma');
//              userFound.removeFromGroup('gosduma',function(err3){
//                if(err3) throw err3;
//                Users.findOne({'username':'testSubject47'},function(err4,userFound2){
//                  if(err4) throw err4;
//                  isMember=userFound2.isMemberOfGroup('gosduma');
//                  done();
//                });
//              });
//            });
//          });
//        });
//      });
//
//      it('isMemberOfGroup returns TRUE if user is in group',function(){
//        isMember.should.equal(true);
//      });
//
//      it('isMemberOfGroup returns FALSE if user is NOT in group',function(){
//        isNotMember.should.equal(false);
//      });
//
//      after(function (done) {
//        user.remove(done)
//      });
      it('to be redone',function(){
        throw new Error('fails and need to be done')
      });
    });
  });
  describe('Testing mwc_core mongoose model of documents', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('Testing mwc_core express application', function() {
    it('it exposes a #MWC.app object',function(){
      MWC.app.should.be.a('function');
    });
  });

  describe('#MWC.extendCore()', function() {

    it('adds the extending core function to array of MWC.setCoreFunctions', function() {
      MWC.setCoreFunctions.should.be.an.instanceOf(Array);
      MWC.setCoreFunctions.should.include(extendCoreFunction);
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

  describe('#MWC.setAppParameters()',function(){
    it('adds the desired functions to MWC.setAppParametersFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.setAppParametersFunctions.should.be.an.instanceOf(Array);
    });
    it('it set extendAppParametersFunction1 to development environment',function(){
      MWC.setAppParametersFunctions.should.includeEql({'environment':'development', 'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction1 to staging environment',function(){
      MWC.setAppParametersFunctions.should.includeEql({'environment':'staging',     'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction2 to development environment',function(){
      MWC.setAppParametersFunctions.should.includeEql({'environment':'development', 'settingsFunction':extendAppParametersFunction2});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC.setAppParametersFunctions.should.includeEql({'environment':'production',  'settingsFunction':extendAppParametersFunction3});
    });

    it('actually works',function(){
      MWC.app.get('TempVar1').should.equal('TempVar1');
      MWC.app.get('TempVar2').should.equal('TempVar2');
      if(typeof MWC.app.get('TempVar3') !== 'undefined'){
        throw new Error('We set app parameter for wrong environment!');
      }
    });
  });


  describe('#MWC.setAppMiddlewares()', function() {
    it('adds the desired functions to MWC.setAppMiddlewaresFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.setAppMiddlewaresFunctions.should.be.an.instanceOf(Array);
    });

    it('it set extendAppMiddlewareFunction1 to all environments and path /',function(){
      MWC.setAppMiddlewaresFunctions.should.includeEql({'path':'/', 'SettingsFunction':extendAppMiddlewareFunction1});
    });
    it('it set extendAppParametersFunction2 to staging environment',function(){
      MWC.setAppMiddlewaresFunctions.should.includeEql({'path':'/', environment:'staging','SettingsFunction':extendAppMiddlewareFunction2});
    });
    it('it set extendAppParametersFunction3 to staging environment',function(){
      MWC.setAppMiddlewaresFunctions.should.includeEql({'path':'/', environment:'staging', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC.setAppMiddlewaresFunctions.should.includeEql({'path':'/', environment:'production', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppMiddlewareFunction3 to development environment and path /middleware3Path',function(){
      MWC.setAppMiddlewaresFunctions.should.includeEql({'path':'/middleware3Path', environment:'development', 'SettingsFunction':extendAppMiddlewareFunction3});
    });
    it('it set extendAppMiddlewareFunction4 to development environment and path /middleware4Path',function(){
      MWC.setAppMiddlewaresFunctions.should.includeEql({environment:'development','path':'/middleware4Path', 'SettingsFunction':extendAppMiddlewareFunction4});
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

      it('this application have headers needed by #MWC.appSetMiddlewares',function(){
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['middleware3'].should.be.equal('middleware3');
      });
    });
  });

  describe('#MWC.extendAppRoutes()', function() {

    it('adds the desired functions to MWC.setAppRoutesFunctions',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.setAppRoutesFunctions.should.be.an.instanceOf(Array);
      MWC.setAppRoutesFunctions.should.includeEql(extendAppRoutesFunction);
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

      it('this application have headers needed by #MWC.appSetMiddlewares',function(){
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
      });
    });
  });

  describe('#MWC.usePlugin(object)', function () {

    describe('extendCore from plugin', function () {
      it('it adds the extending core function to array of #MWC.setCoreFunctions', function () {
        MWC.setCoreFunctions.should.be.an.instanceOf(Array);
        MWC.setCoreFunctions.should.include(extendCoreFunctionPlugin);
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

    describe('setAppParameters from plugin', function () {

      it('it adds the desired functions to #MWC.setAppParametersFunctions', function () {
        if (typeof process.env.NODE_ENV !== 'undefined') {
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC.setAppParametersFunctions.should.be.an.instanceOf(Array);
      });

      it('it set extendAppParametersFunctionPlugin to all environments', function () {
        MWC.setAppParametersFunctions.should.includeEql({'settingsFunction': extendAppParametersFunctionPlugin});
      });

      it('it works', function () {
        MWC.app.get('extendAppParametersFunctionPlugin').should.equal('extended111');
      });
    });

    describe('setAppMiddlewares from plugin',function() {
      it('adds the desired functions to MWC.setAppMiddlewaresFunctions',function(){
        if(typeof process.env.NODE_ENV !== 'undefined'){
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC.setAppMiddlewaresFunctions.should.be.an.instanceOf(Array);
      });

      it('it set extendAppMiddlewareFunctionPlugin to all environments and path "/"',function(){
        MWC.setAppMiddlewaresFunctions.should.includeEql({'path':'/', 'SettingsFunction':extendAppMiddlewareFunctionPlugin});
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

        it('this  application have headers needed by #MWC.appSetMiddlewares',function(){
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });
      });
    });

    describe('extendAppRoutes from plugin',function(){

      it('adds the desired functions to MWC.setAppRoutesFunctions',function(){
        if(typeof process.env.NODE_ENV !== 'undefined'){
          process.env.NODE_ENV.should.be.equal('development');
        }
        MWC.setAppRoutesFunctions.should.be.an.instanceOf(Array);
        MWC.setAppRoutesFunctions.should.includeEql(extendAppRoutesFunctionPlugin);
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

        it('this application have headers needed by #MWC.appSetMiddlewares',function(){
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

  describe('#MWC.usePlugin(pluginName)', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
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

    it('this application have headers needed by #MWC.appSetMiddlewares',function(){
      response.headers['middleware1'].should.be.equal('middleware1');
      response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
    });
  });

  describe('#MWC.listen(http)', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('#MWC.listen(https)', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

});
