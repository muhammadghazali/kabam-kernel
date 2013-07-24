/*jshint immed: false */

var should = require('should'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  blanket = require('blanket');

var MWC = new mwcCore(config);
var extendCoreFunction = function(core){
  core.sum=function(a,b){
    return (a+b);
  };
};
MWC.extendCore(extendCoreFunction);

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

  describe('Testing mwc_core mongoose model of users', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('Testing mwc_core mongoose model of documents', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('Testing mwc_core express application', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('#MWC.extendCore()', function() {

    it('adds the extending core function to array of MWC.setCoreFunctions', function() {
      MWC.setCoreFunctions.should.be.an.instanceOf(Array);
      MWC.setCoreFunctions.should.include(extendCoreFunction);
    });

    it('actully adds new functions to #MWC',function(){
      MWC.sum.should.be.a('function');
      MWC.sum(2,2).should.equal(4);
    });
  });


  describe('#MWC.setAppParameters()',function(){
    it('adds the desired functions to MWC.setAppParametersFunctions',function(){
      if(typeof process.env.NODE_ENV != 'undefined'){
        process.env.NODE_ENV.should.be.equal('development');
      }
      MWC.setAppParametersFunctions.should.be.an.instanceOf(Array); //test fails, but program works. who nows why?
    });
    //todo - fails, because mocha is NOT vows
    it('it set extendAppParametersFunction1 to development environment',function(){
      MWC.setAppParametersFunctions.should.include({'environment':'development', 'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction1 to staging environment',function(){
      MWC.setAppParametersFunctions.should.include({'environment':'staging',     'settingsFunction':extendAppParametersFunction1});
    });
    it('it set extendAppParametersFunction2 to development environment',function(){
      MWC.setAppParametersFunctions.should.include({'environment':'development', 'settingsFunction':extendAppParametersFunction2});
    });
    it('it set extendAppParametersFunction3 to production environment',function(){
      MWC.setAppParametersFunctions.should.include({'environment':'production',  'settingsFunction':extendAppParametersFunction3});
    });

    it('actually works',function(){
      MWC.app.get('TempVar1').should.equal('TempVar1');
      MWC.app.get('TempVar2').should.equal('TempVar2');
      if(typeof MWC.app.get('TempVar3') != 'undefined'){
        throw new Error('We set app parameter for wrong environment!');
      }
    });
  });


  describe('#MWC.setAppMiddlewares()', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('#MWC.extendAppRoutes()', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('#MWC.usePlugin(object)', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('#MWC.usePlugin(pluginName)', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
    });

  });

  describe('#MWC.listen(portNumber)', function() {

    it('to be created', function() {
      throw new Error('Not implemented');
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
