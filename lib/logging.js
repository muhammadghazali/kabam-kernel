var winston = require('winston'),
  path = require('path'),
  fs = require('fs');

function KabamLogger (winston) {
  this.container = new winston.Container();
  this.patchedLoggers = {};
}

KabamLogger.prototype._getModuleName = function _getModuleName (module) {
  var found = false,
    acc = '',
    packageJson,
    packageName;
  var searchPath = module.filename;
  while (!found) {
    // try to find package.json file
    packageJson = path.join(searchPath, 'package.json');
    if (fs.existsSync(packageJson)) {
      packageName = require(packageJson).name;
      acc = path.join(packageName, acc);
      break;
    }

    // prepend current folder to the accumulator
    acc = path.join(path.basename(searchPath), acc);

    // move up one folder in hierarchy
    searchPath = path.join(searchPath, '..');
    // if moving to one folder in hierarchy doesn't have any effect we are reached the root folder
    if (searchPath === path.join(searchPath, '..')) {
      acc = path.join(searchPath, acc);
      break;
    }
  }
  if (path.extname(acc) === '.js') {
    acc = acc.substring(0, acc.length - 3);
  }
  return acc;
};

KabamLogger.prototype.get = function get (name, module, namespace) {
  var _this = this,
    logger,
    patchedLogger;
  // jshint expr: true
  name || (name = 'default');

  logger = this.container.get(name);

  // patching the logger to log the module name, this should not change the original logger log method,
  // so all other modules can use the same logger instance without collisions
  if (module && !this.patchedLoggers[module.filename]) {
    patchedLogger = this.patchedLoggers[module.filename] = Object.create(logger);
    patchedLogger.log = (function (oldMethod) {
      return function (level) {
        var prepend = [];
        if (module) {
          prepend.push('[' + _this._getModuleName(module) + ']');
        }
        if (namespace) {
          prepend.push('(' + namespace + ') -');
        }
        oldMethod.apply(this, [level].concat(prepend.concat([].splice.call(arguments, 1))));
      };
    })(patchedLogger.log);
    // TODO: investigate potential problems
    patchedLogger.setLevels();
  }

  if (module) {
    logger = this.patchedLoggers[module.filename];
  }

  return logger;
};

KabamLogger.prototype.getLogger = function getLogger (name, module, namespace) {
  // module
  // module, namespace
  if (typeof name === 'object') {
    namespace = module;
    module = name;
    name = null;
  }

  // name, namespace
  if (typeof module === 'string') {
    namespace = module;
    module = null;
  }

  return this.get(name, module, namespace);
};

var defaultLogger = new KabamLogger(winston);

exports.KabamLogger = KabamLogger;
exports.getLogger = function (name, module, namespace) {
  return defaultLogger.getLogger.call(defaultLogger, name, module, namespace);
};