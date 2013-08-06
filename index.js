var EventEmitter = require('events').EventEmitter,
  url = require('url'),
  util = require('util'),
  http = require('http'),
  https = require('https'),
  appManager = require('./lib/appManager.js'),
  mongooseManager = require('./lib/mongooseManager.js'),
  redisManager = require('./lib/redisManager.js');

/**
 * @ngdoc function
 * @name MWC
 * @constructor
 * @param {object} config - config object
 */
function MWC(config) {

  EventEmitter.call(this);

  if (typeof config === 'object') {
    if (process.env.redisUrl && !config.redis) {
//Using redis configuration from enviromental value
      config.redis = process.env.redisUrl;
    }
    if (process.env.mongoUrl && !config.mongoUrl) {
//Using mongo configuration from enviromental value
      config.mongoUrl = process.env.mongoUrl;
    }
  }
  this.validateConfig(config);
  this.config = config;

  var _extendCoreFunctions = [],//privileged field
    _extendAppFunctions = [],
    _additionalModels = [],
    _listeners = {},
    _additionalStrategies = [],
    prepared = false,
    _extendMiddlewareFunctions = [],
    _extendRoutesFunctions = [];

  var thisMWC = this;//http://www.crockford.com/javascript/private.html

  //privileged functions
  /**
   * @ngdoc function
   * @name mwc.extendCore
   * @description
   * Perform dependency injection on the mwc object.
   * If mwc do not have fieldName property/method, this method is created as public property/method
   * @param {string} fieldName - field name
   * @param {function/object} factoryFunctionOrObject - function(config), that is called to return value assigned to fieldName
   * config is the mwc.config object, or just a object, to be setted as mwc public field
   * @example
   *
   * mwc.extendCore('checkSecret',function(config){
   *   return function(secretToCheck){
   *     return secretToCheck === config.secret;
   *   };
   * };
   * mwc.extendCore('someVar',42);
   * mwc.extendCore('someArray',[1,2,3]);
   * mwc.extendCore('someObj',{ 'someVal':1});
   *
   */
  this.extendCore = function (fieldName, factoryFunctionOrObject) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof fieldName === 'string') {
        if (typeof factoryFunctionOrObject === 'function') {
          _extendCoreFunctions.push({'field': fieldName, 'factoryFunction': factoryFunctionOrObject});
        } else {
          _extendCoreFunctions.push({'field': fieldName, 'factoryFunction': function () {
            return factoryFunctionOrObject;
          }});
        }
        return this;
      } else {
        throw new Error('MWC.extendCore requires argument of fieldName, value');
      }
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendModel
   * @description
   * Perform dependency injection of mongoose models to mwc.model and request.model.
   * @param {string} modelName - field name
   * @param {object} modelFunction(mongoose, config) - the first argument is mongoose object, the second one is the
   * mwc.config object
   * @example
   *
   * MWC.extendModel('Cats', function (mongoose, config) {
   *   var CatsSchema = new mongoose.Schema({
   *     'nickname': String
   *   });
   *
   *   CatsSchema.index({
   *     nickname: 1
   *   });
   *
   *   return mongoose.model('cats', CatsSchema);
   * });
   *
   * @returns mwc
   */
  this.extendModel = function (modelName, modelFunction) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (modelName === 'Users') {
        throw new Error('Error extending model, "Users" is reserved name');
      } else {
        if (typeof modelName === 'string' && typeof modelFunction === 'function') {
          _additionalModels.push({'name': modelName, 'initFunction': modelFunction});
          return this;
        } else {
          throw new Error('MWC.extendModel requires arguments of string of "modelName" and function(core){...}');
        }
      }
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendListeners
   * @param {string} eventName
   * @param {function} eventHandlerFunction
   * @description - add custom event handler for mwc
   * @example
   *  mwc.extendListeners('someEvent', console.log);
   * @returns mwc
   */
  this.extendListeners = function (eventName, eventHandlerFunction) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof eventName === "string" && typeof eventHandlerFunction === "function") {
        if (typeof _listeners[eventName] === "undefined") {
          _listeners[eventName] = eventHandlerFunction;
          return this;
        } else {
          throw new Error('Unable set listener for event ' + eventName + '! Event name is occupied!');
        }
      } else {
        throw new Error('#MWC.extendListeners(eventName,eventHandlerFunction) have wrong arguments!');
      }
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendStrategy
   * @description
   * Loads new passportjs strategies from object
   * @param {object}strategyObject
   * @returns this
   */
  this.extendStrategy = function(strategyObject){
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if(typeof strategyObject !== 'object') throw new Error('mwc.extendStrategies requires strategyObject to be an object');
      if(typeof strategyObject.strategy !== 'function') throw new Error('mwc.extendStrategies requires strategyObject.strategy to be a proper function!');
      if(typeof strategyObject.routes !== 'function') throw new Error('mwc.extendStrategies requires strategyObject.routes to be a proper function!');
      _additionalStrategies.push(strategyObject);
      return this;
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendApp
   * @description
   * Set app parameters - http://expressjs.com/api.html#express - view engine, variables, locals
   * @param {string / array of strings} environment - application enviroment to use,
   * can be something like 'development', ['development','staging'] or null
   * @param {function} settingsFunction - function(core){....}
   * @example
   *
   * mwc.extendApp('development',function(core){
   *   core.app.locals.environment = 'development';
   * });
   *
   * @returns this
   */
  this.extendApp = function (environment, settingsFunction) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var environmentToUse = null;
      if (typeof settingsFunction === 'undefined') {
        settingsFunction = environment;
        environment = null;
      }
      if (typeof environment === 'string') {
        environmentToUse = [];
        environmentToUse.push(environment);
      }
      if (environment instanceof Array) {
        environmentToUse = environment;
        for (var i = 0; i < environment.length;i++){
          if(typeof environment[i] !== 'string'){
            throw new Error('#MWC.extendApp requires environment name to be a string!');
          }
        }
      }
      if (typeof settingsFunction === 'function') {
        if (environmentToUse) {
          for (var i = 0; i < environmentToUse.length; i++) {
            _extendAppFunctions.push({
              'environment': environmentToUse[i],
              'settingsFunction': settingsFunction
            });
          }
        } else {
          _extendAppFunctions.push({
            'settingsFunction': settingsFunction
          });
        }
      } else {
        throw new Error('Wrong arguments for extendApp(arrayOrStringOfEnvironments,settingsFunction)');
      }
      return this;
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendMiddleware
   * @description
   * Adds  new middleware to expressJS application
   * @param {string / array of strings} environment - application enviroment to use,
   * can be something like 'development', ['development','staging'] or null
   * @param {string} path path to mount middleware - default is /
   * @param {function} settingsFunction function(core){ return function(req,res,next){.....}}
   * @example
   *
   * mwc.extendMiddleware('production',function(core){
   *   return function(req,res,next){
   *     res.setHeader('X-production','YES!');
   *   };
   * }

   * @returns mwc
   */
  this.extendMiddleware = function (environment, path, settingsFunction) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var environmentToUse = null,
        pathToUse = '/',
        settingsFunctionToUse = null;

      if (typeof environment === 'function' && typeof path === 'undefined' && typeof settingsFunction === 'undefined') {
        settingsFunctionToUse = environment;
      }

      if (typeof environment === 'string' || environment instanceof Array) {

        if (typeof environment === 'string') {
          environmentToUse = [];
          environmentToUse.push(environment);
        }
        if (environment instanceof Array) {
          environmentToUse = environment;
          for (var i = 0; i < environment.length;i++){
            if(typeof environment[i] !== 'string'){
              throw new Error('#MWC.extendMiddleware requires environment name to be a string!');
            }
          }
        }
        if (typeof path === 'string') {
          if(/^\//.test(path)){
            pathToUse = path;
            if (typeof settingsFunction === 'function') {
              settingsFunctionToUse = settingsFunction;
            }
          } else {
            throw new Error('#MWC.extendMiddleware path to be a middleware valid path, that starts from "/"!');
          }
        } else {
          if (typeof path === 'function') {
            settingsFunctionToUse = path;
          }
        }
      }

      if (settingsFunctionToUse) {
        if (environmentToUse) {
          for (var i = 0; i < environmentToUse.length; i++) {
            _extendMiddlewareFunctions.push({
              'environment': environmentToUse[i],
              'path': pathToUse,
              'SettingsFunction': settingsFunctionToUse
            });
          }
        } else {
          //we set middleware for all environments
          _extendMiddlewareFunctions.push({
            'path': pathToUse,
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        throw new Error('Wrong arguments for function MWC.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
      }
      return this;
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendRoutes
   * @description
   * Adds new routes to expressJS application
   * @param {function} settingsFunction
   * @example
   *
   * mwc.extendRoutes(function(core){
   *   core.app.get('/', function(req,res){
   *     res.send('Hello!');
   *   });
   * }
   * @returns mwc
   */
  this.extendRoutes = function (settingsFunction) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof settingsFunction === 'function') {
        _extendRoutesFunctions.push(settingsFunction);
        return this;
      } else {
        throw new Error('Wrong argument for MWC.extendAppRoutes(function(core){...});');
      }
    }
  };

  /**
   * @ngdoc function
   * @name mwcKernel.start
   * @description
   * Start mwcKernel application
   * @param {object} howExactly - config object
   * @param {object} options - config object for http(s) server.
   * Values:
   * null - bind expressJS application to default port (process.env.PORT) or 3000 port, returns mwc
   * number - bind expressJS application to this port, returns mwc
   * http instance - bind expressJS application to this server, returns this server object with application bound
   * https instance - bind expressJS application to this server, returns this server object with application bound
   * string of 'app' - start appliation as standalone object, for background workers and console scripts, returns mwc
   */
  this.start = function (howExactly, options) {
    prepared = true;
    //injecting redis
    thisMWC.redisClient = redisManager.create(thisMWC.config.redis);

    // initializing MongoDB and Core Models
    thisMWC.mongoose = mongooseManager.create(thisMWC.config.mongoUrl);
    thisMWC.model = mongooseManager.initModels(thisMWC);

    //doing extendCore
    //extending core by extendCore
    _extendCoreFunctions.map(function (settingsFunction) {
      if (typeof thisMWC[settingsFunction.field] === "undefined") {
        thisMWC[settingsFunction.field] = settingsFunction.factoryFunction(thisMWC.config);
      } else {
        throw new Error('We try to overwrite kernel field with name of ' + settingsFunction.field + '!');
      }
    });

    //loading custom models //todo - maybe redo
    _additionalModels.map(function (customModel) {
      thisMWC.model[customModel.name] = customModel.initFunction(thisMWC.mongoose, thisMWC.config);
    });

    //initialize expressJS application
   thisMWC.app = appManager(thisMWC, _extendAppFunctions, _additionalStrategies, _extendMiddlewareFunctions, _extendRoutesFunctions);

    for (var eventName in _listeners) {
      if (_listeners.hasOwnProperty(eventName)) {
        thisMWC.on(eventName, _listeners[eventName]);
      }
    }

    if (howExactly) {
      if (howExactly === 'app') {
        return thisMWC;
      }

      if (typeof howExactly === 'number' && howExactly > 0) {
        thisMWC.app.listen(howExactly);
        return thisMWC;
      }

      if (howExactly instanceof http || howExactly instanceof https) {
        return howExactly.createServer(thisMWC.app, options);//do not forget to set this http(s) for listening.
      }

      throw new Error('Function MWC.listen(httpOrHttpsOrPort) accepts objects of null, "app", http, https or port\'s number as argument!');
    } else {
      this.app.listen(this.app.get('port'));//listening to default port
      return thisMWC;
    }

  };
}

util.inherits(MWC, EventEmitter);

MWC.prototype.validateConfig = function(config) {
  // General check
  if (typeof config !== 'object') {
    throw new Error('Config is not an object!');
  }
  if (!(config.hostUrl && url.parse(config.hostUrl)['hostname'])) {
    throw new Error('Config.hostUrl have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!!!');
  }
  if (!(config.secret && config.secret.length>9)) {
    throw new Error('Config.secret is not set or is to short!');
  }

  mongooseManager.validateConfig(config.mongoUrl);
  redisManager.validateConfig(config.redis);

  return true;
};

//todo - refactor
MWC.prototype.usePlugin = function (pluginObjectOrName) {
  throw new Error('usePlugin IS BROKEN!');

  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    var pluginToBeInstalled = {};
    if (typeof pluginObjectOrName === 'string') {
      pluginToBeInstalled = require('' + pluginObjectOrName);
    } else {
      pluginToBeInstalled = pluginObjectOrName;
    }

    if (pluginToBeInstalled.extendCore) {
      this.extendCore(pluginToBeInstalled.extendCore);
    }
    if (pluginToBeInstalled.extendModel && typeof pluginToBeInstalled.extendModel === 'object') {
      for (var x in pluginToBeInstalled.extendModel) {
        this.extendModel(x, pluginObjectOrName.extendModel[x]);
      }
    }
    if(pluginToBeInstalled.setAppParameters && typeof pluginToBeInstalled.extendApp === 'undefined'){
      console.log('Plugin is outdated! Use extendApp instead of setAppParameters with same syntax!');
      pluginToBeInstalled.extendApp=pluginToBeInstalled.setAppParameters;
    }
    if (pluginToBeInstalled.extendApp) {
      this.extendApp(pluginToBeInstalled.extendApp);
    }
    if(pluginToBeInstalled.setAppMiddlewares && typeof pluginToBeInstalled.extendMiddleware === 'undefined'){
      console.log('Plugin is outdated! Use extendMiddleware instead of setAppMiddlewares with same syntax!');
      pluginToBeInstalled.extendMiddleware=pluginToBeInstalled.setAppMiddlewares;
    }
    if (pluginToBeInstalled.extendMiddleware) {
      this.extendMiddleware(pluginToBeInstalled.extendMiddleware);
    }
    if(pluginToBeInstalled.extendAppRoutes && typeof pluginToBeInstalled.extendRoutes === 'undefined'){
      console.log('Plugin is outdated! Use extendMiddleware instead of setAppMiddlewares with same syntax!');
      pluginToBeInstalled.extendRoutes=pluginToBeInstalled.extendAppRoutes;
    }
    if (pluginToBeInstalled.extendRoutes) {
      this.extendRoutes(pluginToBeInstalled.extendRoutes);
    }
    return this;
  }
};

//todo ^^^ make privileged


//legacy support, outdated
MWC.prototype.ready = function (){
  console.log('MWC.ready is outdated, use MWC.start with the same syntax');
  return this.start('app');
};

MWC.prototype.listen = function (httpOrHttpsOrPort,options){
  console.log('MWC.listen is outdated, use MWC.start with the same syntax');
  return this.start(httpOrHttpsOrPort,options);
};

MWC.prototype.setAppParameters = function(environment, settingsFunction){
  console.log('setAppParameters is outdated, use extendApp  with the same syntax');
  this.extendApp(environment, settingsFunction);
  return this;
};

MWC.prototype.extendMiddlewares = function(environment, path, settingsFunction){
  console.log('extendMiddlewares is outdated, use extendMiddleware with the same syntax');
  this.extendMiddleware(environment, path, settingsFunction);
  return this;
};

MWC.prototype.setAppMiddlewares = function(environment, path, settingsFunction){
  console.log('setAppMiddlewares is outdated, use extendMiddleware with the same syntax');
  this.extendMiddleware(environment, path, settingsFunction);
  return this;
};

MWC.prototype.extendAppRoutes = function(settingsFunction){
  console.log('extendAppRoutes is outdated, use extendRoutes with the same syntax');
  this.extendRoutes(settingsFunction);
  return this;
};
//legacy support, outdated ^^^

/**
 * @ngdoc function
 * @name mwc.injectEmit
 * @description
 * Injects a function .emit(eventName,eventObj) for every object. This function
 * is used for making every object to be able to emit events through mwc
 * @param {object} object - object to be extended
 */
MWC.prototype.injectEmit = function(object) {
  var thisMWC = this;
  object.emitMWC = function (eventName, eventContent) {
    thisMWC.emit(eventName, eventContent);
  };
};

/**
 * @ngdoc function
 * @name mwc.createRedisClient
 * @description
 * Create new redis client
 *
 * Use this function with great caution! Because usually redis-database-as-a-service providers have
 * strict connection limit!!! and every one redis client created like this consumes one connection!
 * Usually, MWC needs only one redis client connection
 * BTW, redis is NOT MySQL - we can't increase speed with connection pooling!
 * @returns {RedisClient} redis client
 */
MWC.prototype.createRedisClient = function() {
  return redisManager.create(this.config.redis);
};

/**
 * @ngdoc function
 * @name mwcKernel.create
 * @description
 * Create MWC object instance (factory)
 * @param {object} config - config object
 */
MWC.create = function(config) {
  return new MWC(config);
};

module.exports = exports = MWC.create;
