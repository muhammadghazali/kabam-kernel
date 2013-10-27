'use strict';
/**
 * If kernel do not have proper config object, it tries to create it by itself,
 * Sometimes it is successful
 */

var dotty = require('dotty'),
  util = require('util');

require('assert');

// depth first recursive walking
function walk (object, callback, errback) {
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      try {
        if (typeof object[prop] === 'object') {
          walk(object[prop], callback);
        } else {
          callback(object, prop);
        }
      } catch (e) {
        errback(e, object, prop);
      }
    }
  }
}

// error that is thrown when config parsing error occurs
// if this error is thrown current processed plugin will be disabled
// TODO: jsdoc
function ConfigParseError (message, pluginName, key) {
  Error.captureStackTrace(this, ConfigParseError);
//  Error.call(this, message);
  this.name = 'ConfigParseError';
  this.message = message;
  this.pluginName = pluginName;
  this.key = key;
}

util.inherits(ConfigParseError, Error);

ConfigParseError.prototype.toString = function () {
  return 'Error: ' + this.pluginName + ' can\'t parse configuration for ' + this.key + ' - ' + this.message;
};

// receives config object and default values (factories) in the {'FIELD.SUBFIELD': factory} format
// returns a list with disabled plugins
function processSchema (config, defaults) {
  Object.keys(defaults).forEach(function (key) {
    var valueFactory = defaults[key];
    dotty.put(config, key, function getter () {
      // if we don't have a cached value evaluate factory function passing config as context
      if (!config['_' + key]) {
        config['_' + key] = valueFactory(config);
      }

      // all values a cached on the config
      return config['_' + key];
    });

  });

  // first walk to tranform all functions to getters
  walk(config, function (object, property) {
    Object.defineProperty(object, property, {
      get: object[property]
    });
  });

  var disabledPlugins = [];

  // second walk to cache all values and get errors

  walk(config, function (object, property) {
    // jshint expr: true
    //noinspection BadExpressionStatementJS
    object[property];
  }, function(err, object, prop){
    delete object[prop];
    if(!(err instanceof ConfigParseError)){
      throw err;
    }
    if(disabledPlugins.indexOf(err.pluginName) < 0) {
      disabledPlugins.push(err.pluginName);
    }
  });

  return disabledPlugins;
}

// used to `bind` parsing error to plugin name and configKey
function configParseErrorFactory (pluginName, configKey) {
  return function (message) {
    return new ConfigParseError(message, pluginName, configKey);
  };
}

// default values can be functions, we normalize them to just functions using this function =\
function defaultValueGetterFactory (value) {
  return function (context) {
    if (typeof value !== 'function') {
      return value;
    }
    return value.call(context);
  };
}

// if config key has parse function it will be used to generate config value
function parserFactory (parser, defaultValueGetter, ConfigParseError) {
  return function (context) {
    var value = defaultValueGetter(context);
    if (value === undefined) {
      throw new ConfigParseError('Value is required');
    }
    if (parser) {
      value = parser.call(context, value, ConfigParseError);
    }
    return value;
  };
}

module.exports = function buildConfig(rawConfig, plugins) {
  var
    config = {},
    // map: key -> value getter
    defaults = {};

  Object.keys(plugins).forEach(function (pluginName) {
    var plugin = plugins[pluginName];
    // schemas is an object like {"VAR_NAME": {doc:..., default:..., env:...} }
    var schemas = plugin.config;

    if (!schemas) {
      return;
    }

    Object.keys(schemas).forEach(function (key) {
      var schema = schemas[key],
        ConfigParseError = configParseErrorFactory(pluginName, key),
        defaultValueGetter;
      // populate default values
      if (schema.default !== undefined) {
        // put default value at the path. If the key contains dots, they will be treated as object path separator,
        // i.e. "PASSPORT.TWITTER" is treated as {PASSPORT:{TWITTER:...}}
        defaults[key] = schema.default;
      }
      // populate values using passed config
      if (dotty.exists(rawConfig, key)) {
        defaults[key] = dotty.get(rawConfig, key);
      }
      // populate values using environment variables
      if (schema.env && process.env[schema.env]) {
        defaults[key] = process.env[schema.env];
      }
      // jshint expr: true
      defaultValueGetter = defaultValueGetterFactory(defaults[key]);
      defaults[key] = parserFactory(schema.parse, defaultValueGetter, ConfigParseError);
    });
  });

  var disabledPlugins = processSchema(config, defaults);
  return {
    config: config,
    disabledPlugins: disabledPlugins
  };
};
