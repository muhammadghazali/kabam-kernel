/* jshint expr: true */
var winston = require('winston'),
  path = require('path');

// monkey patch transport logging function to strip colors from messages
winston.transports.File.prototype.log = (function(log){
  return function(level, msg, meta, callback){
    msg = ('' + msg).replace(/\u001b\[(\d+(;\d+)*)?m/g, '');
    log.call(this, level, msg, meta, callback);
  };
})(winston.transports.File.prototype.log);

exports.core = function(kernel){
  // if no logging configuration provided just return
  // it will keep default settings on all loggers, which means that by default they should
  // log to the console
  if(!kernel.config.LOGGING){
    return;
  }

  // log all application messages to a file, this would include error messages too
  if(kernel.config.LOGGING.FILE){
    var FILE = kernel.config.LOGGING.FILE,
      // default config file path
      filePath = 'logs/application.log',
      // file transport options
      options,
      // file transport
      transport;

    // FILE could be a boolean, a string and an object
    // if have a string we treat is as log file path
    if(typeof FILE === 'string'){
      filePath = FILE;
    // if we have an object a file name could be specified as PATH field
    } else if(typeof FILE === 'object' && typeof FILE.PATH === 'string') {
      filePath = FILE.PATH;
    }

    // resolve path to logs, this is allows us to specify an absolute path in the config
    filePath = path.resolve(kernel.config.BASE_DIR, filePath);
    options = {
      level: FILE.LEVEL || 'info',
      filename: filePath
    };
    FILE.MAX_SIZE || (options.maxsize = FILE.MAX_SIZE);
    FILE.MAX_FILES || (options.maxsize = FILE.MAX_FILES);

    transport = new winston.transports.File(options);

    // configuring transports for all future loggers
    kernel.logging.container.options.transports = [transport];

    // configure transports for all existing loggers
    var loggers = kernel.logging.getLoggers();
    Object.keys(loggers).forEach(function(name){
      var logger = loggers[name];
      // transport, options, created?
      logger.add(transport, null, true);
    });
  }
};