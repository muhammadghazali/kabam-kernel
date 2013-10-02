var
  os = require('os'),
  should = require('should'),
  async = require('async'),
  kabamKernel = require('./../index.js'),
  config = require('./../example/config.json').testing,
  request = require('request');

var kernel;
describe('ConfigManager', function(){

  afterEach(function () {
    kernel.stop();
  });

  describe('HOST_URL', function(){
    it('should combine localhost + config.PORT in development mode', function(){
      var localConfig = Object.create(config);
      localConfig.HOST_URL = undefined;
      localConfig.PORT = 1234;
      kernel = kabamKernel(localConfig);
      kernel.start('app');
      kernel.config.HOST_URL.should.be.equal('http://localhost:1234/');
    });

    it('should combine os.hostname() + config.PORT in non development modes', function(){
      var localConfig = Object.create(config);
      localConfig.ENV = 'production';
      localConfig.HOST_URL = undefined;
      localConfig.PORT = 1234;
      kernel = kabamKernel(localConfig);
      kernel.start('app');
      kernel.config.HOST_URL.should.be.equal('http://'+os.hostname()+':1234/');
    });

  });

  describe('PORT', function(){
    it('should default to 3000', function(){
      var kernel = kabamKernel(config);
      config.PORT = undefined;
      kernel.start('app');
      kernel.config.PORT.should.be.equal(3000);
    });
    it('should be redefined by kernel#start', function(){
      var localConfig = Object.create(config);
      localConfig.HOST_URL = undefined;
      localConfig.PORT = 1234;
      kernel = kabamKernel(localConfig);
      kernel.start(42345);
      kernel.httpServer.close();
      kernel.config.HOST_URL.should.be.equal('http://localhost:42345/');
    });
  });

  describe('MONGO_URL', function(){
    it('should default to mongodb://localhost/kabam_dev', function(){
      var localConfig = Object.create(config);
      localConfig.MONGO_URL = undefined;
      kernel = kabamKernel(localConfig);
      kernel.start('app');
      kernel.config.MONGO_URL.should.be.equal('mongodb://localhost/kabam_dev');
    });
  });
  //TODO: redis parsing test
});