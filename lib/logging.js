var intel = require('intel'),
  path = require('path'),
  fs = require('fs');

function KabamLogging (intel) {
  this.root = new intel.Logger();
}

KabamLogging.prototype.getModuleName = function _getModuleName (module) {
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

KabamLogging.prototype.getLogger = function get (name, module) {
  if(typeof name === 'object'){
    module = name;
    name = null;
  }
  var loggerName;

  if(module) {
    loggerName = this.getModuleName(module);
  }

  if(name && loggerName) {
    loggerName = name + '.' + loggerName;
  } else if (name) {
    loggerName = name;
  }

  return this.root.getLogger(loggerName);
};

var logging = new KabamLogging(intel);

module.exports = logging;
module.exports.KabamLogging = KabamLogging;
