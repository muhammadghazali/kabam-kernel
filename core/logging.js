/* jshint expr: true */
var intel = require('intel'),
  path = require('path'),
  util = require('util');


function ColorStrippingFormatter(options){
  intel.Formatter.call(this, options);
  this.code = /\u001b\[(\d+(;\d+)*)?m/g;
}

util.inherits(ColorStrippingFormatter, intel.Formatter);

ColorStrippingFormatter.prototype.format = function(record){
  record.message = ('' + record.message).replace(this.code, '');
  return intel.Formatter.prototype.format.call(this, record);
};

/*
 * Helper function to create file transports based on the config value
 * @param file - config value for a file
 * @param baseDir - base directory for the default file path
 * @param filePath - default file path
 */
function makeFileHandlerOptions(file, baseDir, filePath) {
  // file transport options
  var options;

  // file could be a boolean, a string and an object
  // if have a string we treat is as log file path
  if (typeof file === 'string') {
    filePath = file;
    // if we have an object a file name could be specified as PATH field
  } else if (typeof file === 'object' && typeof file.PATH === 'string') {
    filePath = file.PATH;
  }

  // resolve path to logs, this is allows us to specify an absolute path in the config
  filePath = path.resolve(baseDir, filePath);
  options = {
    level: file.LEVEL || 'info',
    file: filePath,
    formatter: new ColorStrippingFormatter({
      format: file.FORMAT || '%O'
    })
  };
  file.MAX_SIZE || (options.maxSize = file.MAX_SIZE);
  file.MAX_FILES || (options.maxFiles = file.MAX_FILES);

  return options;
}

exports.core = function (kernel) {
  var LOGGING = kernel.config.LOGGING,
    httpLogger = kernel.logging.getLogger('http'),
    rootLogger = kernel.logging.getLogger(),
    consoleHandler,
    options;

  // in the development and staging environments express is logging all http request to the console
  // and to log http messages user should explicitly set config variable LOGGING.HTTP
  httpLogger.propagate = false;

  consoleHandler = new intel.handlers.Console({
    formatter: new intel.Formatter({
      format: '[%(levelname)s] %(name)s - %(message)s',
      colorize: true
    })
  });
  rootLogger._handlers = [];
  rootLogger.addHandler(consoleHandler);


  // if no logging configuration provided just return
  // it will keep default settings on all loggers, which means that by default they should
  // log to the console
  if (!LOGGING) {
    return;
  }

  // default level for root logger
  if(LOGGING.LEVEL){
    rootLogger.setLevel(LOGGING.LEVEL);
  }

  // shut the console handler for the root logger (production, tests, etc...)
  if(LOGGING.CONSOLE === false){
    rootLogger.removeHandler(consoleHandler);
  }

  // log all application messages to a file, this would include error messages, and http logs
  // if no http specific logging is set up.
  if (LOGGING.FILE) {
    options = makeFileHandlerOptions(LOGGING.FILE, kernel.config.BASE_DIR, 'logs/application.log');
    rootLogger.addHandler(new intel.handlers.File(options));
  }

  // by default http logger logs everything to the application log (if file logging is enabled),
  // but be can log to the specific file
  if (LOGGING.HTTP) {
    options = makeFileHandlerOptions(LOGGING.HTTP, kernel.config.BASE_DIR, 'logs/http.log');
    httpLogger.addHandler(new intel.handlers.File(options));
  }

  if (LOGGING.ERROR) {
    options = makeFileHandlerOptions(LOGGING.HTTP, kernel.config.BASE_DIR, 'logs/error.log');
    var errorHandler = new intel.handlers.File(options);
    errorHandler.addFilter(new intel.Filter(function(record){
      return record.levelname === 'ERROR' || record.stack;
    }));
    rootLogger.addHandler(errorHandler);
  }
  // TODO: error log (using filters)
};