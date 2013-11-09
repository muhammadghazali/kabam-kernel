var KabamLogger = require('../lib/logging').KabamLogging,
  createKabam = require('./helpers').createKabam,
  intel = require('intel'),
  util = require('util'),
  path = require('path'),
  os = require('os'),
  fs = require('fs'),
  NOW = Date.now(),
  counter = 1;

require('should');

function TestHandler (options) {
  intel.Handler.call(this, options);
  this.records = [];
}

util.inherits(TestHandler, intel.Handler);

TestHandler.prototype.emit = function customEmit (record, callback) {
  this.records.push(record);
  callback(null);
};


function tmp () {
  return path.join(os.tmpDir(),
    'kabam-' + NOW + '-' + process.pid + '-' + (counter++));
}

describe('Kabam Logging', function () {
  var logging;

  beforeEach(function () {
    logging = new KabamLogger(intel, module);
    logging.getLogger()._handle = [];
  });


  describe('#getLogger()', function () {
    it('should return root logger', function () {
      var testHandler = new TestHandler(),
        logger = logging.getLogger();
      logger.addHandler(testHandler);
      testHandler.records.should.have.length(0);
      logger.info('ololo');
      testHandler.records.should.have.length(1);
    });
  });

  describe('#getLogger(<name>)', function () {
    it('should return child logger', function () {
      var testHandler = new TestHandler(),
        rootLogger = logging.getLogger(),
        childLogger = logging.getLogger();

      rootLogger.addHandler(testHandler);
      testHandler.records.should.have.length(0);
      childLogger.info('42');
      testHandler.records.should.have.length(1);
    });
  });

});

describe('Kabam Logging Configuration', function () {
  // http logger doesn't propagate by default
  // LOGGING.FILE options
  // LOGGING.HTTP options
  var kabam;
  describe('http logger', function () {
    describe('default configuration', function () {
      before(function (done) {
        createKabam({MONGO_URL: 'mongodb://localhost/kabam_test'}, function (err, _kabam) {
          kabam = _kabam;
          done(err);
        });
      });
      after(function () {
        kabam.stop();
      });
      it('should not propagate records by default', function () {
        var rootLogger = kabam.logging.getLogger(),
          httpLogger = kabam.logging.getLogger('http'),
          rootHandler = new TestHandler(),
          httpHandler = new TestHandler();
        rootLogger.addHandler(rootHandler);
        httpLogger.addHandler(httpHandler);
        rootHandler.records.should.have.length(0);
        httpHandler.records.should.have.length(0);
        httpLogger.info('ermahgerd');
        rootHandler.records.should.have.length(0);
        httpHandler.records.should.have.length(1);
      });
    });
  });
  describe('LOGGING.HTTP = true', function () {
    var BASE_DIR;
    beforeEach(function (done) {
      BASE_DIR = tmp();
      fs.mkdirSync(BASE_DIR);
      fs.mkdirSync(path.join(BASE_DIR, 'logs'));
      createKabam({
        MONGO_URL: 'mongodb://localhost/kabam_test',
        BASE_DIR: BASE_DIR,
        LOGGING: {
          HTTP: true
        }
      }, function (err, _kabam) {
        kabam = _kabam;
        done(err);
      });
    });
    afterEach(function () {
      kabam.stop();
    });
    it('should log to the logs/http.log in the config.BASE_DIR', function () {
      var httpLogger = kabam.logging.getLogger('http');
      httpLogger.info('ermahgerd').then(function (done) {
        var record = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'logs/http.log'), 'utf8'));
        record.message.should.be.equal('ermahgerd');
        done();
      });
    });
  });
  describe('LOGGING.HTTP = <filename>', function () {
    var tmpdir;
    beforeEach(function (done) {
      tmpdir = tmp();
      fs.mkdirSync(tmpdir);
      createKabam({
        MONGO_URL: 'mongodb://localhost/kabam_test',
        LOGGING: {
          HTTP: path.join(tmpdir, 'can-haz-http.logs')
        }
      }, function (err, _kabam) {
        kabam = _kabam;
        done(err);
      });
    });
    afterEach(function () {
      kabam.stop();
    });
    it('should log to the logs/http.log in the config.BASE_DIR', function () {
      var httpLogger = kabam.logging.getLogger('http');
      httpLogger.info('ermahgerd').then(function (done) {
        var record = JSON.parse(fs.readFileSync(path.join(tmpdir, 'can-haz-http.logs'), 'utf8'));
        record.message.should.be.equal('ermahgerd');
        done();
      });
    });
  });
});