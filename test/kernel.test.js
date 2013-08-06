/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');

describe('Kernel', function() {

  var MWC;


  /*
   * Extending core
   */


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

  /* Adding custom routes
   *
   */

  var extendRoutesFunction = function (core){
    core.app.get('/someRoute',function (req,res){
      res.send('HI');
    });
  };

  //load plugin as an object

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


  before(function(done) {
    MWC = mwcKernel(config);

    MWC.extendCore('sum', function(config){
      return function(a,b){
        return a+b;
      }
    });
    MWC.extendCore('SomeVar',42);

    MWC.extendModel('Cats',extendModelFunction);

    MWC.extendApp(['development', 'staging'], extendAppParametersFunction1);
    MWC.extendApp('development', extendAppParametersFunction2);
    MWC.extendApp('production', extendAppParametersFunction3);

    MWC.extendMiddleware(extendAppMiddlewareFunction1);
    MWC.extendMiddleware('staging',extendAppMiddlewareFunction2);
    MWC.extendMiddleware(['staging','production'],extendAppMiddlewareFunction3);
    MWC.extendMiddleware(['development'],'/middleware3Path',extendAppMiddlewareFunction3);
    MWC.extendMiddleware('development','/middleware4Path',extendAppMiddlewareFunction4);

    MWC.extendRoutes(extendRoutesFunction);
    //*/

     MWC.usePlugin({
     'extendCore': {'mul':function(config){return function(a,b){return a*b}}},
     'extendModel':{'Dogs':extendModelFunctionPlugin},
     'extendApp': extendAppParametersFunctionPlugin,
     "extendMiddleware": extendAppMiddlewareFunctionPlugin,
     'extendRoutes': extendRoutesFunctionPlugin
     });
     //*/
    //create and start this application
    MWC.start(3000);
    setTimeout(done,1000);
  });

  after(function(done){
    MWC.mongoose.disconnect();
    done();
  });
  describe('Testing exposed objects of running mwcKernel', function() {

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
        MWC.extendMiddleware(['development', 'staging'], function() {
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

    it('setted the "prepared" property to true - pending, because prepared is private value');

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

  describe('Testing mwc_core express application', function() {
    it('it exposes a #MWC.app object',function(){
      MWC.app.should.be.a('function');
    });
  });

  describe('#MWC.extendCore()', function() {

    it('adds the extending core function to array of MWC._extendCoreFunctions - pending, because _extendCoreFunctions is private value');

    it('actually adds new functions to #MWC',function(){
      MWC.SomeVar.should.be.equal(42);
      MWC.sum.should.be.a('function');
      MWC.sum(2,2).should.equal(4);
    });
  });

  describe('#MWC.extendModel()',function(){
    it('adds the extending model function to array of #MWC._additionalModels - pending, because _additionalModels is private value');

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
    it('We are running the correct environment',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
    });

    it('actually works',function(){
      MWC.app.get('TempVar1').should.equal('TempVar1');
      MWC.app.get('TempVar2').should.equal('TempVar2');
      if(typeof MWC.app.get('TempVar3') !== 'undefined'){
        throw new Error('We set app parameter for wrong environment!');
      }
    });
  });

  describe('#MWC.extendMiddleware()', function() {
    it('We are running the correct environment',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
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

      it('this application have headers needed by #MWC.extendMiddleware',function(){
        response.headers['middleware1'].should.be.equal('middleware1');
        response.headers['middleware3'].should.be.equal('middleware3');
      });
    });
  });

  describe('#MWC.extendRoutes()', function() {

    it('We are running the correct environment',function(){
      if(typeof process.env.NODE_ENV !== 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
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

      it('this application have headers needed by #MWC.extendMiddleware',function(){
        response.headers['middleware1'].should.be.equal('middleware1');
      });
    });
  });
//*/
  describe('#MWC.usePlugin(object)', function () {

    describe('extendCore from plugin', function () {

      it('it actually adds new functions to #MWC.core', function () {
        MWC.mul.should.be.a('function');
        MWC.mul(3,2).should.equal(6);
      });
    });

    describe('extendModel from plugin', function() {
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

      it('it works', function () {
        MWC.app.get('extendAppParametersFunctionPlugin').should.equal('extended111');
      });
    });

    describe('extendMiddleware from plugin',function() {

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

        it('this  application have headers needed by #MWC.extendMiddleware',function(){
          response.headers['middleware1'].should.be.equal('middleware1');
          response.headers['extendappmiddlewarefunctionplugin'].should.be.equal('OK');
        });
      });
    });

    describe('extendRoutes from plugin',function(){

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

        it('this application have headers needed by #MWC.extendMiddleware',function(){
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
//*/
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

    it('this application have headers needed by #MWC.extendMiddleware',function(){
      response.headers['middleware1'].should.be.equal('middleware1');
    });

    describe('this application have proper rate limiting headers',function(){
      var resetTime=Math.floor(new Date().getTime()/1000)+80;
      it('have x-ratelimit-limit to 200',function(){
        parseInt(response.headers['x-ratelimit-limit']).should.be.equal(200);
      });
      it('have the x-ratelimit-reset header with valid value',function(){
        parseInt(response.headers['x-ratelimit-reset']).should.be.below(resetTime);
      });
      it('have the x-ratelimit-reset-in-seconds header with valid value',function(){
        parseInt(response.headers['x-ratelimit-reset-in-seconds']).should.be.below(61);
      });
      it('have the x-ratelimit-remaining header with valid value',function(){
        parseInt(response.headers['x-ratelimit-remaining']).should.be.below(201);
      });
    });

  });

});
