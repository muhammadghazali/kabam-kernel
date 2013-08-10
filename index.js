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
 * @name mwc
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
   * Perform dependency injection on the mwc.shared object.
   * If mwc do not have fieldName property/method, this method is created as public property/method
   * @param {string} fieldName - field name
   * @param {function/object/string/number/array} factoryFunctionOrObject - function(config),
   * what is called to return value assigned to fieldName  config is the mwc.config object, or just a object, to be setted as mwc public field
   * @param {string} namespace - namespace to bind this field. default is 'shared;
   * @example
   * ```javascript
   *
   *     mwc.extendCore('checkSecret',function(config){
   *       return function(secretToCheck){
   *         return secretToCheck === config.secret;
   *       };
   *     };
   *
   *     mwc.extendCore('someVar',42);
   *     mwc.extendCore('someArray',[1,2,3]);
   *     mwc.extendCore('someObj',{ 'someVal':1});
   *     mwc.extendCore('a',333,'inThatNamespace');
   *
   *     mwc.start('app');
   *
   *     console.log(mwc.shared.checkSecret('someThing'); //false
   *     console.log(mwc.shared.someVar); //42
   *     console.log(mwc.shared.someArray); //[1,2,3]
   *     console.log(mwc.shared.someObj); //{ 'someVal':1}
   *     console.log(mwc.inThatNamespace.a); //333
   *
   *  ```
   * @returns {mwc} mwc object
   */
  this.extendCore = function (fieldName, factoryFunctionOrObject, namespace) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (!namespace) {
        namespace = 'shared';
      }

      if (typeof fieldName === 'string' && typeof factoryFunctionOrObject !== 'undefined') {
        if (typeof factoryFunctionOrObject === 'function') {
          _extendCoreFunctions.push({'field': fieldName, 'factoryFunction': factoryFunctionOrObject, 'namespace': namespace});
        } else {
          _extendCoreFunctions.push({'field': fieldName, 'factoryFunction': function () {
            return factoryFunctionOrObject;
          }, 'namespace': namespace});
        }
        return this;
      } else {
        throw new Error('MWC.extendCore requires argument of fieldName(string), and value - function(config){} or object!');
      }
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendModel
   * @description
   * Perform dependency injection of mongoose models to mwc.model and request.model.
   * When you call `extendModel(modelName,function(mongoose, config){...})` you get all the environment created after calling
   * `extendCore(function(core){...})`.
   * @param {string} modelName - field name, "Users" is reserved field name!
   * @param {function} modelFunction - function(mongoose, config) - the first argument is mongoose object, the second one is the
   * mwc.config object
   * @example
   * ```javascript
   *
   *     MWC.extendModel('Cats', function (mongoose, config) {
   *        var CatsSchema = new mongoose.Schema({
   *         'nickname': String
   *        });
   *
   *       return mongoose.model('cats', CatsSchema);
   *     });
   *
   * ```
   * @returns {mwc} mwc object
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
   * @name mwc.extendStrategy
   * @description
   * Loads new passportjs strategies from object
   * @param {object} strategyObject Passport's strategy object
   * @returns {mwc} mwc object
   * @url https://github.com/mywebclass/mwc_kernel/blob/master/lib/strategies/github.js
   * @example
   * ```javascript
   *
   * mwc.extendStrategy({
   * 'strategy':function (core) {
   * return new LinkedInStrategy({
   *    consumerKey: core.config.passport.LINKEDIN_API_KEY,
   *    consumerSecret: core.config.passport.LINKEDIN_SECRET_KEY,
   *    callbackURL: core.config.hostUrl + 'auth/linkedin/callback'
   *    }, function (token, tokenSecret, profile, done) {
   *       var email = profile.emails[0].value;
   *      if (email) {
   *        core.model.Users.processOAuthProfile(email,done);
   *      } else {
   *        return done(new Error('There is something strange instead of user profile'));
   *      }
   *  });
   * },
   * 'routes':function (passport, core) {
   *     core.app.get('/auth/linkedin', passport.authenticate('linkedin'),
   *        function (req, res) {
   *
   *     });
   *     core.app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/' }),
   *       function (req, res) {
   *         res.redirect('/');
   *       });
   *     };
   *  });
   * ```
   */
  this.extendStrategy = function (strategyObject) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof strategyObject !== 'object') {
        throw new Error('mwc.extendStrategies requires strategyObject to be an object');
      }
      if (typeof strategyObject.strategy !== 'function') {
        throw new Error('mwc.extendStrategies requires strategyObject.strategy to be a proper function!');
      }
      if (typeof strategyObject.routes !== 'function') {
        throw new Error('mwc.extendStrategies requires strategyObject.routes to be a proper function!');
      }
      _additionalStrategies.push(strategyObject);
      return this;
    }
  };

  /**
   * @ngdoc function
   * @name mwc.extendApp
   * @description
   * Set app parameters - view engine, variables, locals
   * When you call `extendApp(function(core){...})`, you can set global application parameters, for example
   * template [engines](http://expressjs.com/api.html#app.engine), [locals](http://expressjs.com/api.html#app.locals)
   * and [other](http://expressjs.com/api.html#app-settings) settings.
   * In code it is called [after setting logging middleware and port](https://github.com/mywebclass/mwc_kernel/blob/master/lib/appManager.js#84).
   * You can set any application parameter you want, you have full MWC core internals at your disposal
   * `mwc.emit`,`mwc.on`, `mwc.redisClient`, and `mwc.model.User` and custom models from calling `extendModel`.
   *
   * @param {string/array/undefined} environment - application environment to use,
   * can be something like 'development', ['development','staging'] or null
   *
   * @param {function} settingsFunction - function(core){....}
   * @example
   *
   * ```javascript
   *
   *     mwc.extendApp('development',function(core){
   *       core.app.locals.environment = 'development';
   *     });
   *
   * ```
   *
   * @returns {mwc} mwc object
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
        for (var i = 0; i < environment.length; i++) {
          if (typeof environment[i] !== 'string') {
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
   * Adds new middleware to expressJS application
   * They are [applied]((https://github.com/mywebclass/mwc_kernel/blob/master/index.js#L283) after
   * [setting default exposed internals middleware](https://github.com/mywebclass/mwc_kernel/blob/master/lib/appManager.js#L114) and before
   * [setting router middleware](https://github.com/mywebclass/mwc_kernel/blob/master/lib/appManager.js#L142).

   * So, you have the full power of core internals - (`emit`,`on`), `redisClient`, `model.User`
   * and exposed internals middleware - where expressJS object of request have functions of `request.mwcEmit`,
   * `request.model`,`request.model.User`, `request.emitMWC`, custom models,`request.redisClient`, and `request.user` provided
   * by passportjs middleware.
   * @param {string/array/undefined} environment - application enviroment to use,
   * can be something like 'development', ['development','staging'] or null (for ALL enviroments)
   * @param {string/undefined} path path to mount middleware - default is /
   * @param {function} settingsFunction function(core){ return function(req,res,next){.....}}
   * @example
   * ```javascript
   *
   *     mwc.extendMiddleware('production',function(core){
   *       return function(req,res,next){
   *         res.setHeader('X-production','YES!');
   *       };
   *     }
   *
   * ```
   * @returns {mwc} mwc object
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
          for (var i = 0; i < environment.length; i++) {
            if (typeof environment[i] !== 'string') {
              throw new Error('#MWC.extendMiddleware requires environment name to be a string!');
            }
          }
        }
        if (typeof path === 'string') {
          if (/^\//.test(path)) {
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
   * Adds application routes and verbs for them.
   * ExpressJS object of every routes request have functions of `request.mwcEmit`,
   * `request.model`,`request.model.User`, `request.emitMWC`, custom models,`request.redisClient`, and `request.user` provided
   * by [passportjs](http://passportjs.org) middleware.
   * @param {function} settingsFunction Settings Function
   * @example
   * ```javascript
   *
   *     mwc.extendRoutes(function(core){
   *       core.app.get('/', function(req,res){
   *         res.send('Hello!');
   *       });
   *     }
   * ```
   * @returns {mwc} mwc object
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
   * @name mwc.usePlugin
   * @description
   * Loads plugin from object or npm module
   * @param {object/string} pluginObjectOrName - config object or plugin name to get by require
   * @url https://github.com/mywebclass/mwc_kernel/blob/master/example/plugin.example.js
   */
  this.usePlugin = function (pluginObjectOrName) {
    if (prepared) {
      throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var pluginToBeInstalled = {};
      if (typeof pluginObjectOrName === 'string') {
        pluginToBeInstalled = require('' + pluginObjectOrName);
      } else {
        pluginToBeInstalled = pluginObjectOrName;
      }

      if (typeof pluginToBeInstalled.name === 'string' && /^[a-z0-9_\-]+$/.test(pluginToBeInstalled.name) && pluginObjectOrName.name === 'shared') {
        throw new Error('Wrong plugin syntax. Plugin name is missed or have wrong syntax!');
      }

      if (typeof pluginToBeInstalled.core === 'object') {
        for (var field in pluginToBeInstalled.core) {
          if (pluginToBeInstalled.core.hasOwnProperty(field)) {
            this.extendCore(field, pluginToBeInstalled.core[field], pluginToBeInstalled.name);
          }
        }
      }
      if (typeof pluginToBeInstalled.model === 'object') {
        for (var x in pluginToBeInstalled.model) {
          if (pluginToBeInstalled.model.hasOwnProperty(x)) {
            this.extendModel(x, pluginToBeInstalled.model[x]);
          }
        }
      }

      if (typeof pluginToBeInstalled.strategy === 'object') {
        if (typeof pluginToBeInstalled.strategy.strategy === 'function' && typeof pluginToBeInstalled.strategy.routes === 'function') {
          this.extendStrategy(pluginToBeInstalled.strategy);
        } else {
          throw new Error('plugin.strategy has wrong syntax! strategy and routes have to be functions!');
        }
      }

      if (typeof pluginToBeInstalled.app === 'function') {
        this.extendApp(pluginToBeInstalled.app);
      }

      if(typeof pluginToBeInstalled.middleware !== 'undefined'){
        if (pluginToBeInstalled.middleware instanceof Array) {
          for (var i = 0; i < pluginToBeInstalled.middleware.length; i++) {
            if (typeof pluginToBeInstalled.middleware[i] === 'function') {
              this.extendMiddleware(pluginToBeInstalled.middleware[i]);
            } else {
              throw new Error('plugin.middleware[' + i + '] is not a function!');
            }
          }
        } else {
          if (typeof pluginToBeInstalled.middleware === 'function') {
            this.extendMiddleware(pluginToBeInstalled.middleware);
          } else {
            throw new Error('plugin.middleware is not a function!');
          }
        }
      }
      if (typeof pluginToBeInstalled.routes === 'function') {
        this.extendRoutes(pluginToBeInstalled.routes);
      }

      if (typeof pluginToBeInstalled.listeners === 'object') {
        for (var x in pluginToBeInstalled.listeners) {
          if (pluginToBeInstalled.listeners.hasOwnProperty(x)) {
            this.extendListeners(x, pluginToBeInstalled.listeners[x]);
          }
        }
      }

      return this;
    }
  };

  /**
   * @ngdoc function
   * @name mwc.start
   * @description
   * Start mwc application
   * @param {object} howExactly - config object
   * Values:
   *
   * - null - bind expressJS application to default port (process.env.PORT) or 3000 port, returns mwc
   * - number - bind expressJS application to this port, returns mwc
   * - http instance - bind expressJS application to this server, returns this server object with application bound
   * - https instance - bind expressJS application to this server, returns this server object with application bound
   * - string of 'app' - start appliation as standalone object, for background workers and console scripts, returns mwc
   *
   * @param {object} options - config object for https server.
   * @url http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
   *
   */
  this.start = function (howExactly, options) {
    prepared = true;

    //injecting redis
    thisMWC.redisClient = redisManager.create(thisMWC.config.redis);

    //injecting mongoose and additional models
    thisMWC.model = mongooseManager.injectModels(thisMWC, _additionalModels);

    _extendCoreFunctions.map(function (settingsFunction) {

      if (typeof thisMWC[settingsFunction.namespace] === 'undefined') {
        thisMWC[settingsFunction.namespace] = {};
      }
      if (typeof thisMWC[settingsFunction.namespace][settingsFunction.field] === 'undefined') {
        thisMWC[settingsFunction.namespace][settingsFunction.field] = settingsFunction.factoryFunction(thisMWC.config);
      } else {
        throw new Error('Kernel namespace collision - namespace "' + settingsFunction.namespace + '" already have field of ' + settingsFunction.field);
      }

    });

    //initialize expressJS application
    thisMWC.app = appManager(thisMWC, _extendAppFunctions, _additionalStrategies, _extendMiddlewareFunctions, _extendRoutesFunctions);

    if (howExactly) {
      if (howExactly === 'app') {
        return thisMWC;
      }
      if (typeof howExactly === 'number' && howExactly > 0) {
        thisMWC.app.listen(howExactly);
        return thisMWC;
      }
      if (howExactly instanceof https) {
        return howExactly.createServer(thisMWC.app);//do not forget to set this http for listening.
      }
      if (howExactly instanceof http) {
        return howExactly.createServer(thisMWC.app, options);//do not forget to set this https for listening.
      }
      throw new Error('Function MWC.listen(httpOrHttpsOrPort) accepts objects of null, "app", http, https or port\'s number as argument!');
    } else {
      this.app.listen(this.app.get('port'));//listening to default port
      return thisMWC;
    }
  };
}

util.inherits(MWC, EventEmitter);

MWC.prototype.validateConfig = function (config) {
  // General check
  if (typeof config !== 'object') {
    throw new Error('Config is not an object!');
  }
  if (!(config.hostUrl && url.parse(config.hostUrl)['hostname'])) {
    throw new Error('Config.hostUrl have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!!!');
  }
  if (!(config.secret && config.secret.length > 9)) {
    throw new Error('Config.secret is not set or is to short!');
  }

  mongooseManager.validateConfig(config.mongoUrl);
  redisManager.validateConfig(config.redis);

  return true;
};


/**
 * @ngdoc function
 * @name mwc.extendListeners
 * @param {string} eventName Name of the event
 * @param {function} eventHandlerFunction Function to handle the event
 * @description - add custom event handler for mwc
 * @example
 * ``` javascript
 *
 *      mwc.extendListeners('someEvent', console.log);
 *
 * ```
 * @returns {mwc} mwc object
 */
MWC.prototype.extendListeners = function (eventName, eventHandlerFunction) {
  if (typeof eventName === 'string' && typeof eventHandlerFunction === 'function') {
    this.on(eventName, eventHandlerFunction);
    return this;
  } else {
    throw new Error('#MWC.extendListeners(eventName,eventHandlerFunction) have wrong arguments!');
  }
};


/**
 * @ngdoc function
 * @name mwc.injectEmit
 * @description
 * Injects a function .emit(eventName,eventObj) for every object. This function
 * is used for making this object to be able to emit events through mwc
 * @param {object} object - object to be extended
 */
MWC.prototype.injectEmit = function (object) {
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
MWC.prototype.createRedisClient = function () {
  return redisManager.create(this.config.redis);
};

/**
 * @ngdoc function
 * @name mwc.create
 * @description
 * Create MWC object instance (factory)
 * @param {object} config - config object
 */
MWC.create = function (config) {
  return new MWC(config);
};

module.exports = exports = MWC.create;
