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
  if(process.env.redisUrl && !config.redis){
//Using redis configuration from enviromental value
    config.redis=process.env.redisUrl;
  }
  if(process.env.mongoUrl && !config.mongoUrl){
//Using mongo configuration from enviromental value
    config.mongoUrl=process.env.mongoUrl;
  }
  }
  this.validateConfig(config);
  this.config = config;
  this._extendCoreFunctions = [];
  this._additionalModels = [];
  this._extendAppFunctions = [];
  this._additionalStrategies = [];
  this._extendMiddlewaresFunctions = [];
  this._extendRoutesFunctions = [];
  this._listeners = {};

  return this;
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

//extending application
MWC.prototype.extendCore = function (fieldName,value) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    if (typeof fieldName === 'string') {
      this._extendCoreFunctions.push({'field':fieldName,'value':value});
      return this;
    } else {
      throw new Error('MWC.extendCore requires argument of fieldName, value');
    }
  }
};

MWC.prototype.extendModel = function (modelName, modelFunction) {
  if (modelName === 'Users') {
    throw new Error('Error extending model, "Users" is reserved name');
  } else {
    if (typeof modelName === 'string' && typeof modelFunction === 'function') {
      this._additionalModels.push({'name': modelName, 'initFunction': modelFunction});
      return this;
    } else {
      throw new Error('MWC.extendModel requires arguments of string of "modelName" and function(core){...}');
    }
  }
};

MWC.prototype.extendApp = function (environment, settingsFunction) {
  if (this.prepared) {
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
          this._extendAppFunctions.push({
            'environment': environmentToUse[i],
            'settingsFunction': settingsFunction
          });
        }
      } else {
        this._extendAppFunctions.push({
          'settingsFunction': settingsFunction
        });
      }
    } else {
      throw new Error('Wrong arguments for extendApp(arrayOrStringOfEnvironments,settingsFunction)');
    }
    return this;
  }
};

MWC.prototype.extendStrategies = function(strategyObject){
  if(typeof strategyObject !== 'object') throw new Error('mwc.extendStrategies requires strategyObject to be an object');
  if(typeof strategyObject.strategy !== 'function') throw new Error('mwc.extendStrategies requires strategyObject.strategy to be a proper function!');
  if(typeof strategyObject.routes !== 'function') throw new Error('mwc.extendStrategies requires strategyObject.routes to be a proper function!');

  this._additionalStrategies.push(strategyObject);
  return this;
};

MWC.prototype.extendMiddlewares = function (environment, path, settingsFunction) {
  if (this.prepared) {
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
            throw new Error('#MWC.extendMiddlewares requires environment name to be a string!');
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
          throw new Error('#MWC.extendMiddlewares path to be a middleware valid path, that starts from "/"!');
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
          this._extendMiddlewaresFunctions.push({
            'environment': environmentToUse[i],
            'path': pathToUse,
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        //we set middleware for all environments
        this._extendMiddlewaresFunctions.push({
          'path': pathToUse,
          'SettingsFunction': settingsFunctionToUse
        });
      }
    } else {
      throw new Error('Wrong arguments for function MWC.extendMiddlewares(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    }
    return this;
  }
};

MWC.prototype.extendRoutes = function (settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    if (typeof settingsFunction === 'function') {
      this._extendRoutesFunctions.push(settingsFunction);
      return this;
    } else {
      throw new Error('Wrong argument for MWC.extendAppRoutes(function(core){...});');
    }
  }
};
//todo - refactor
MWC.prototype.usePlugin = function (pluginObjectOrName) {
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
    if(pluginToBeInstalled.setAppMiddlewares && typeof pluginToBeInstalled.extendMiddlewares === 'undefined'){
      console.log('Plugin is outdated! Use extendMiddlewares instead of setAppMiddlewares with same syntax!');
      pluginToBeInstalled.extendMiddlewares=pluginToBeInstalled.setAppMiddlewares;
    }
    if (pluginToBeInstalled.extendMiddlewares) {
      this.extendMiddlewares(pluginToBeInstalled.extendMiddlewares);
    }
    if(pluginToBeInstalled.extendAppRoutes && typeof pluginToBeInstalled.extendRoutes === 'undefined'){
      console.log('Plugin is outdated! Use extendMiddlewares instead of setAppMiddlewares with same syntax!');
      pluginToBeInstalled.extendRoutes=pluginToBeInstalled.extendAppRoutes;
    }
    if (pluginToBeInstalled.extendRoutes) {
      this.extendRoutes(pluginToBeInstalled.extendRoutes);
    }
    return this;
  }
};


MWC.prototype.extendListeners = function (eventName, eventHandlerFunction) {
  if (typeof eventName === "string" && typeof eventHandlerFunction === "function") {
    if (typeof this._listeners[eventName] === "undefined") {
      this._listeners[eventName] = eventHandlerFunction;
      return this;
    } else {
      throw new Error('Unable set listener for event ' + eventName + '! Event name is occupied!');
    }
  } else {
    throw new Error('#MWC.extendListeners(eventName,eventHandlerFunction) have wrong arguments!');
  }
};

MWC.prototype.ready = function () {
  var thisMWC = this;//because we sometimes issue closures with thisMWC
  thisMWC.prepared = true;

  //injecting redis
  thisMWC.redisClient = redisManager.create(thisMWC.config.redis);

  // initializing MongoDB and Core Models
  thisMWC.mongoose = mongooseManager.create(thisMWC.config.mongoUrl);
  thisMWC.mongoose.setConnectEvent(thisMWC);
  thisMWC.model = mongooseManager.initModels(thisMWC);

  //doing extendCore
  //extending core by extendCore
  thisMWC._extendCoreFunctions.map(function (settingsFunction) {
    if(typeof thisMWC[settingsFunction.field] === "undefined"){
      thisMWC[settingsFunction.field]=settingsFunction.value;
    } else {
      throw new Error('We try to overwrite kernel field with name of '+settingsFunction.field+'!');
    }
  });

  //loading custom models //todo - maybe redo
  thisMWC._additionalModels.map(function (customModel) {
    thisMWC.model[customModel.name] = customModel.initFunction(thisMWC.mongoose, thisMWC.config);
  });

  //initialize expressJS application
  thisMWC.app = appManager.create(thisMWC);
  appManager.extendApp(thisMWC);

  // set shutdown procedure
  process.on('SIGINT', thisMWC.shutdown);

  for(var eventName in thisMWC._listeners){
    thisMWC.on(eventName, thisMWC._listeners[eventName]);
  }

  return thisMWC;
};

MWC.prototype.listen = function (httpOrHttpsOrPort) {

  if (!this.prepared) {
    this.ready();
  }

  if (httpOrHttpsOrPort) {
    if (typeof httpOrHttpsOrPort === 'number' && httpOrHttpsOrPort > 0) {
      this.app.listen(httpOrHttpsOrPort);
      return;
    }

    if (httpOrHttpsOrPort instanceof http || httpOrHttpsOrPort instanceof https) {
      httpOrHttpsOrPort.createServer(this.app).listen(this.app.get('port'));
      return;
    }
    throw new Error('Function MWC.listen(httpOrHttpsOrPort) accepts objects of null, http, https or port\'s number as argument!');
  } else {
    this.app.listen(this.app.get('port'));//listening to default port
  }
};

MWC.prototype.setAppParameters = function(environment, settingsFunction){
  console.log('setAppParameters is outdated, use extendApp  with the same syntax');
  this.extendApp(environment, settingsFunction);
  return this;
};

MWC.prototype.setAppMiddlewares = function(environment, path, settingsFunction){
  console.log('setAppMiddlewares is outdated, use extendMiddlewares with the same syntax');
  this.extendMiddlewares(environment, path, settingsFunction);
  return this;
};

MWC.prototype.extendAppRoutes = function(settingsFunction){
  console.log('extendAppRoutes is outdated, use extendRoutes with the same syntax');
  this.extendRoutes(settingsFunction);
  return this;
};

MWC.prototype.shutdown = function () {

  console.log('MWC IS GOING TO SHUT DOWN....');
  if(this.mongoose.connection){
    this.mongoose.connection.close();
  }
  this.redisClient.end();
  // calling .shutdown allows your process to exit normally
  toobusy.shutdown();
  process.exit();

};

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
