var KabamLogger = require('../lib/logging').KabamLogging,
  winston = require('winston'),
  util = require('util');

require('should');


var TestTransport = function(options){
  // jshint expr: true
  options || (options = {});
  this.name = 'testTransport';
  this.level = options.level || 'info';
  this.logRecords = [];
};

util.inherits(TestTransport, winston.Transport);

TestTransport.prototype.log = function(level, msg, meta, callback){
  this.logRecords.push({
    level: level,
    msg:msg,
    meta:meta
  });
  callback(null, true);
};

var getLogger = function(logging, name, module, namespace){
  var logger = logging.getLogger(name, module, namespace);
  if(logger.transports.console){
    logger.remove(winston.transports.Console);
  }
  if(!logger.transports.testTransport){
    logger.add(TestTransport);
  }
  return logger;
};

var getLogs = function(logger){
  return logger.transports.testTransport.logRecords;
};

describe('Kabam Logging', function(){
  var logging;

  beforeEach(function(){
    logging = new KabamLogger(winston, module);
  });

  describe('getLogger()', function(){
    var logger;
    beforeEach(function(){
      logger = getLogger(logging);
    });
    it('should return a default logger instance', function(){
      var defaultLogger = logging.getLogger('default');
      logger.info('Some message');
      getLogs(defaultLogger).should.have.lengthOf(1);
    });
    describe('#log', function(){
      it('should save the message', function(){
        logger.info('Some message');
        getLogs(logger).should.have.lengthOf(1);
        getLogs(logger)[0].level.should.be.eql('info');
        getLogs(logger)[0].msg.should.be.eql('Some message');
      });
    });
  });

  describe('getLogger(<name>)', function(){
    it('should return a separate instance of the logger', function(){
      var defaultLogger = getLogger(logging),
        namedLogger = getLogger(logging, 'coolname');
      defaultLogger.info('some message');
      defaultLogger.should.not.be.eql(namedLogger);
    });
    describe('#log', function(){
      it('should save messages only to this logger', function(){
        var defaultLogger = getLogger(logging),
          namedLogger = getLogger(logging, 'coolname');
        defaultLogger.info('some message');
        getLogs(defaultLogger).should.have.lengthOf(1);
        getLogs(namedLogger).should.have.lengthOf(0);
        namedLogger.info('cool message');
        getLogs(defaultLogger).should.have.lengthOf(1);
        getLogs(namedLogger).should.have.lengthOf(1);
      });
    });
  });

  describe('getLogger(<module>)', function(){
    it('should return a module-bound instance of the default logger', function(){
      var defaultLogger = getLogger(logging),
        moduleLogger = getLogger(logging, module);
      defaultLogger.info('some message');
      moduleLogger.info('module message');
      getLogs(defaultLogger).should.have.lengthOf(2);
      getLogs(moduleLogger).should.have.lengthOf(2);
    });
    describe('#log', function(){
      it('should save messages to a logger instance but prefix them with module path', function(){
        var defaultLogger = getLogger(logging),
          moduleLogger = getLogger(logging, module);
        defaultLogger.info('some message');
        moduleLogger.info('module message');
        getLogs(moduleLogger)[1].msg.should.be.eql('[kabam-kernel/test/logger.test] module message');
      });
    });
  });

  describe('getLogger(<name>, <module>)', function(){
    it('should return a module-bound instance of the named logger', function(){
      var defaultLogger = getLogger(logging, 'some-name'),
        moduleLogger = getLogger(logging, 'some-name', module);
      defaultLogger.info('some message');
      moduleLogger.info('module message');
      getLogs(defaultLogger).should.have.lengthOf(2);
      getLogs(moduleLogger).should.have.lengthOf(2);
    });
    describe('#log', function(){
      it('should save messages to a logger instance but prefix them with module path', function(){
        var defaultLogger = getLogger(logging, 'some-name'),
          moduleLogger = getLogger(logging, 'some-name', module);
        defaultLogger.info('some message');
        moduleLogger.info('module message');
        getLogs(moduleLogger)[1].msg.should.be.eql('[kabam-kernel/test/logger.test] module message');
      });
    });
  });

  describe('getLogger(<module>, <name-space>)', function(){
    it('should append namespace to the logging messages', function(){
      var defaultLogger = getLogger(logging),
        namespacedLogger = getLogger(logging, module, 'some-namespace');
      defaultLogger.info('some message');
      namespacedLogger.info('module message');
      getLogs(defaultLogger).should.have.lengthOf(2);
      getLogs(namespacedLogger).should.have.lengthOf(2);
      getLogs(namespacedLogger)[1].msg.should.be.eql('[kabam-kernel/test/logger.test] (some-namespace) - module message');
    });
  });

});