'use strict';
var EventEmitter = require('events').EventEmitter,
  appBuilder = require('./lib/app-builder'),
  configBuilder = require('./lib/config-builder.js'),
  logging = require('./lib/logging'),
  logger = logging.getLogger(module);

require('colors');

/**
 * @ngdoc function
 * @name kabamKernel
 * @constructor
 * @param {object} config - config object
 */
function KabamKernel (config) {
  EventEmitter.call(this);
  this.config = config;
  this.logging = logging;
  // plugin registry
  this._registry = {};
  this._composed = false;
  this._extendCoreFunctions = [];
  this._extendConfigEntries = [];
  this._extendAppFunctions = [];
  this._additionalModels = {};
  this._additionalStrategies = [];
  this._extendMiddlewareFunctions = [];
  this._extendRoutesFunctions = [];
  this._catchAllFunction = null;
}


KabamKernel.prototype = {
  //jshint proto: true, camelcase: false
  __proto__: EventEmitter.prototype,
  /**
   * @ngdoc function
   * @name kabamKernel.extendCore
   * @description
   * Perform dependency injection on the kabam.shared object.
   * If kabam do not have fieldName property/method, this method is created as public property/method.
   * You can call this function multiple times. Later this field/method can be called by `kabam.nameSpaceName.fieldName`. `nameSpaceName`
   * can be ommited, default value is `shared`
   * @param {string} fieldName - field name
   * @param {function/object/string/number/array} factory  function(config),
   * what is called to return value assigned to fieldName  config is the kabam.config object, or just a object, to be setted as kabam public field
   * @example
   * ```javascript
   *
   *     kabam.extendCore('checkSecret',function(config){
   *       return function(secretToCheck){
   *         return secretToCheck === config.secret;
   *       };
   *     };
   *
   *     kabam.extendCore('someVar',42);
   *     kabam.extendCore('someArray',[1,2,3]);
   *     kabam.extendCore('someObj',{ 'someVal':1});
   *     kabam.extendCore('a',333,'inThatNamespace');
   *
   *     kabam.start('app');
   *
   *     console.log(kabam.shared.checkSecret('someThing'); //false
   *     console.log(kabam.shared.someVar); //42
   *     console.log(kabam.shared.someArray); //[1,2,3]
   *     console.log(kabam.shared.someObj); //{ 'someVal':1}
   *     console.log(kabam.inThatNamespace.a); //333
   *
   *  ```
   * @returns {kabamKernel} kabamKernel object
   */
  extendCore: function (fieldName, factory) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }
    var extension, value;
    if (typeof fieldName === 'function') {
      factory = fieldName;
      fieldName = null;
    }

    if (!factory) {
      throw new Error('KabamKernel.extendCore requires argument of fieldName(string), ' +
        'and value - function(config){} or function!');
    }

    if (typeof factory !== 'function') {
      value = factory;
      factory = function () {
        return value;
      };
    }

    if (fieldName) {
      extension = {'field': fieldName, 'factory': factory};
    } else {
      extension = factory;
    }

    this._extendCoreFunctions.push(extension);

    return this;
  },

  extendConfig: function (configEntry) {
    this._extendConfigEntries.push(configEntry);
  },

  /**
   * @ngdoc function
   * @name kabamKernel.extendModel
   * @description
   * Perform dependency injection of mongoose models to kabam.model and request.model.
   * When you call `extendModel(name,function(kabamKernel){...})` you get all the environment created after calling
   * `extendCore(function(core){...})`.
   * @param {string} name - field name, "Users" is reserved field name!
   * @param {function} factory - function(kabamKernel) - the first argument is mongoose object, the second one is the
   * kabam.config object
   * @example
   * ```javascript
   *
   *     KabamKernel.extendModel('Cats', function (kabam) {
   *        var CatsSchema = new kabam.mongoose.Schema({
   *         'nickname': String
   *        });
   *
   *       return CatsSchema;
   *     });
   *
   * ```
   * @returns {kabamKernel} kabamKernel object
   */
  extendModel: function (name, factory) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }

    if (typeof name === 'string' && typeof factory === 'function') {
      this._additionalModels[name] = factory;
    } else {
      throw new Error('KabamKernel.extendModel requires arguments of string of "name" and function(core){...}');
    }
    return this;
  },

  /**
   * @ngdoc function
   * @name kabamKernel.extendStrategy
   * @description
   * Loads new passportjs strategies from object
   * @param {function} factory - function returning Passport's strategy object
   * @returns {kabamKernel} kabamKernel object
   * @url https://github.com/mykabam/kabam-kernel/blob/master/lib/strategies/github.js
   * @example
   * ```javascript
   *
   * kabam.extendStrategy(function (core) {
   *   return new LinkedInStrategy({
   *     consumerKey: core.config.passport.LINKEDIN_API_KEY,
   *     consumerSecret: core.config.passport.LINKEDIN_SECRET_KEY,
   *     callbackURL: core.config.HOST_URL + 'auth/linkedin/callback'
   *   }, function (token, tokenSecret, profile, done) {
   *     var email = profile.emails[0].value;
   *     if (email) {
   *       core.model.User.linkEmailOnlyProfile(email,done);
   *     } else {
   *       return done(new Error('There is something strange instead of user profile'));
   *     }
   *  });
   * });
   * ```
   */
  extendStrategy: function (factory) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }
    if (typeof factory !== 'function') {
      throw new Error('kabam.extendStrategy requires and argument to be a function returning strategy object!');
    }
    this._additionalStrategies.push(factory);
  },

  /**
   * @ngdoc function
   * @name kabamKernel.extendApp
   * @description
   * Set app parameters - view engine, variables, locals
   * When you call `extendApp(function(core){...})`, you can set global application parameters, for example
   * template [engines](http://expressjs.com/api.html#app.engine), [locals](http://expressjs.com/api.html#app.locals)
   * and [other](http://expressjs.com/api.html#app-settings) settings.
   * In code it is called [after setting logging middleware and port](https://github.com/mykabam/kabam-kernel/blob/master/lib/appManager.js#84).
   * You can set any application parameter you want, you have full Kabam core internals at your disposal
   * `kabam.emit`,`kabam.on`, `kabam.redisClient`, and `kabam.model.User` and custom models from calling `extendModel`.
   * Some example of setting up the [template engine](https://github.com/mykabam/kabam-plugin-hogan/blob/master/index.js)
   * via plugin.
   *
   * @param {string/array/undefined} environment - application environment to use,
   * can be something like 'development', ['development','staging'] or null
   *
   * @param {function} settingsFunction - function(core){....}
   * @example
   *
   * ```javascript
   *
   *     kabam.extendApp('development',function(core){
   *       core.app.locals.environment = 'development';
   *     });
   *     //example of setting template engine
   *     kabam.extendApp.app = function (core) {
   *       core.app.set('views', '/views');
   *       core.app.set('view engine', 'html');
   *       core.app.set('layout', 'layout');
   *       core.app.enable('view cache');
   *       core.app.engine('html', require('hogan-express'));
   *     };
   * ```
   *
   * @returns {kabamKernel} kabamKernel object
   */
  extendApp: function (environment, settingsFunction) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var environmentToUse = null,
        i,
        j;
      if (settingsFunction === undefined) {
        settingsFunction = environment;
        environment = null;
      }
      if (typeof environment === 'string') {
        environmentToUse = [];
        environmentToUse.push(environment);
      }
      if (environment instanceof Array) {
        environmentToUse = environment;
        for (i = 0; i < environment.length; i = i + 1) {
          if (typeof environment[i] !== 'string') {
            throw new Error('KabamKernel.extendApp requires environment name to be a string!');
          }
        }
      }
      if (typeof settingsFunction === 'function') {
        if (environmentToUse) {
          for (j = 0; j < environmentToUse.length; j = j + 1) {
            this._extendAppFunctions.push({
              'environment': environmentToUse[j],
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
  },

  /**
   * @ngdoc function
   * @name kabamKernel.extendMiddleware
   * @description
   * Adds new middleware to expressJS application
   * This function can be executed multiple times, the middlewares applied are used in application in *order* they were issued by this function.
   * First argument (array of enviroments), and the second one (the path where to use middleware, the default is "/") are OPTIONAL
   * They are [applied](https://github.com/mykabam/kabam-kernel/blob/master/index.js#L283) after
   * [setting default exposed internals middleware](https://github.com/mykabam/kabam-kernelblob/master/lib/appManager.js#L114) and before
   * [setting router middleware](https://github.com/mykabam/kabam-kernel/blob/master/lib/appManager.js#L142).
   * So, you have the full power of core internals - (`emit`,`on`), `redisClient`, `model.User`
   * and exposed internals middleware - where expressJS object of request have functions of `request.kabamEmit`,
   * `request.model`,`request.model.User`, `request.emitMWC`, custom models,`request.redisClient`, and `request.user` provided
   * by passportjs middleware.
   * @param {string/array/undefined} environment - application enviroment to use,
   * can be something like 'development', ['development','staging'] or null (for ALL enviroments)
   * @param {string/undefined} path path to mount middleware - default is /
   * @param {function} settingsFunction function(core){ return function(req,res,next){.....}}
   * @example
   * ```javascript
   *
   *     kabam.extendMiddleware('production',function(core){
   *       return function(req,res,next){
   *         res.setHeader('X-production','YES!');
   *       };
   *     }
   *
   * ```
   * @returns {kabamKernel} kabamKernel object
   */
  extendMiddleware: function (environment, path, settingsFunction) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var environmentToUse = null,
        pathToUse = '/',
        settingsFunctionToUse = null,
        k,
        l;

      if (typeof environment === 'function' && path === undefined && settingsFunction === undefined) {
        settingsFunctionToUse = environment;
      }

      if (typeof environment === 'string' || environment instanceof Array) {

        if (typeof environment === 'string') {
          environmentToUse = [];
          environmentToUse.push(environment);
        }
        if (environment instanceof Array) {
          environmentToUse = environment;
          for (k = 0; k < environment.length; k = k + 1) {
            if (typeof environment[k] !== 'string') {
              throw new Error('KabamKernel.extendMiddleware requires environment name to be a string!');
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
            throw new Error('KabamKernel.extendMiddleware path to be a middleware valid path, that starts from "/"!');
          }
        } else {
          if (typeof path === 'function') {
            settingsFunctionToUse = path;
          }
        }
      }

      if (settingsFunctionToUse) {
        if (environmentToUse) {
          for (l = 0; l < environmentToUse.length; l = l + 1) {
            this._extendMiddlewareFunctions.push({
              'environment': environmentToUse[l],
              'path': pathToUse,
              'SettingsFunction': settingsFunctionToUse
            });
          }
        } else {
          //we set middleware for all environments
          this._extendMiddlewareFunctions.push({
            'path': pathToUse,
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        throw new Error('Wrong arguments for function KabamKernel.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
      }
      return this;
    }
  },

  /**
   * @ngdoc function
   * @name kabamKernel.extendRoutes
   * @description
   * Adds application routes and verbs for them.
   * ExpressJS object of every routes request have functions of `request.kabamEmit`,
   * `request.model`,`request.model.User`, `request.emitMWC`, custom models,`request.redisClient`, and `request.user` provided
   * by [passportjs](http://passportjs.org) middleware.
   * @param {function} settingsFunction Settings Function
   * @example
   * ```javascript
   *
   *     kabam.extendRoutes(function(core){
   *       core.app.get('/', function(req,res){
   *         res.send('Hello!');
   *       });
   *     }
   * ```
   * @returns {kabamKernel} kabamKernel object
   */
  extendRoutes: function (settingsFunction) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof settingsFunction === 'function') {
        this._extendRoutesFunctions.push(settingsFunction);
      } else {
        throw new Error('Wrong argument for KabamKernel.extendAppRoutes(function(core){...});');
      }
      return this;
    }
  },

  /**
   * @ngdoc function
   * @name kabamKernel.catchAll
   * @description
   * Provides ability to add a "catch all" callback function that will be called only if no
   * middleware returned a response nor any route have been matched.
   * @param {function} func callback function
   * @example
   * ```javascript
   *
   *     kernel.catchAll(function(kernel){
   *       return function(req, res){
   *         res.send(404);
   *       }
   *     });
   * ```
   */
  catchAll: function (func) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }
    if (typeof func !== 'function') {
      throw new Error('Wrong argument for KabamKernel.catchAll(function(kernel){...});');
    }
    this._catchAllFunction = func;
  },

  /**
   * @ngdoc function
   * @name kabamKernel.usePlugin
   * @description
   * Loads plugin from object or npm module
   * @param {object/string} plugin - plugin object
   * @url https://github.com/mykabam/kabam-kernel/blob/master/example/plugin.example.js
   */
  usePlugin: function (plugin) {
    if (this._composed) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }
    if (!plugin.name) {
      throw new Error('Can\'t add a plugin without a name');
    }
    this._registry[plugin.name] = plugin;
    return this;
  },

  /**
   * @ngdoc function
   * @name kabamKernel.compose
   * @description
   * Composes all plugins together and freezes the app, you cannot install more plugins after composing.
   * Application is composed automatically when it is started, so this method should be used only when you need
   * a KabamKernel instance without launching the app itself.
   */
  compose: function () {
    var configBuild, disabledPlugins;
    // create config
    configBuild = configBuilder(this.config || {}, this._registry);
    disabledPlugins = configBuild.disabledPlugins;
    this.config = configBuild.config;

    Object.keys(disabledPlugins).forEach(function(name){
      delete this._registry[name];
    }, this);

    // digesting all registered plugins, this may extend disabled plugins list
    Object.keys(this._registry).forEach(function(name){
      try{
        this._digestPlugin(this._registry[name], disabledPlugins);
      } catch (e) {
        if(e.message.indexOf(name) === -1){
          throw e;
        }
        disabledPlugins[name] = e;
      }
    }, this);


    this._composed = true;

    // dependencies used by some plugins
    this.extensions = {
      models: this._additionalModels,
      strategies: this._additionalStrategies
    };

    //initialize expressJS application
    this.app = appBuilder(
      this,
      this._extendCoreFunctions,
      this._extendAppFunctions,
      this._extendMiddlewareFunctions,
      this._extendRoutesFunctions,
      this._catchAllFunction
    );

    Object.keys(disabledPlugins).forEach(function(name){
      logger.warn('PLUGIN DISABLED: ', name, '-', disabledPlugins[name].toString());
    });

  },

  _digestPlugin: function (plugin, disabledPlugins) {
    var key;

    // process plugin dependencies and throw error if dependencies unmet
    if(plugin.dependencies){
      // if some of the dependencies are disabled disable this plugin too
      plugin.dependencies.forEach(function(name){
        if(disabledPlugins[name]){
          throw new Error(plugin.name + ': can\'t find `'+name+'` dependency');
        }
      });
      // or if the registry doesn't have a plugin with this name
      plugin.dependencies.forEach(function(name){
        if(!this._registry[name]){
          throw new Error(plugin.name + ': can\'t find `'+name+'` dependency');
        }
      }, this);
    }

    if (typeof plugin.core === 'object') {
      for (key in plugin.core) {
        if (plugin.core.hasOwnProperty(key)) {
          this.extendCore(key, plugin.core[key], plugin.name);
        }
      }
    }

    if (typeof plugin.core === 'function') {
      this.extendCore(plugin.core);
    }

    if (typeof plugin.model === 'object') {
      for (key in plugin.model) {
        if (plugin.model.hasOwnProperty(key)) {
          this.extendModel(key, plugin.model[key]);
        }
      }
    }

    if (plugin.strategy){
      if(typeof plugin.strategy !== 'function') {
        throw new Error('plugin.strategy has be function returning strategy object!');
      }
      this.extendStrategy(plugin.strategy);
    }

    if (typeof plugin.app === 'function') {
      this.extendApp(plugin.app);
    }

    if (plugin.middleware !== undefined) {
      if(!Array.isArray(plugin.middleware)){
        plugin.middleware = [plugin.middleware];
      }
      plugin.middleware.forEach(function(middlewareComponent, i){
        if (typeof middlewareComponent !== 'function') {
          throw new Error(plugin.name + '.middleware[' + i + '] is not a function!');
        }
        this.extendMiddleware(middlewareComponent);
      }, this);
    }

    if (typeof plugin.routes === 'function') {
      this.extendRoutes(plugin.routes);
    }

    if (typeof plugin.listeners === 'object') {
      for (key in plugin.listeners) {
        if (plugin.listeners.hasOwnProperty(key)) {
          this.extendListeners(key, plugin.listeners[key]);
        }
      }
    }

    return true;
  },

  /**
   * @ngdoc function
   * @name kabamKernel.start
   * @description
   * Start kabam application
   * Parameters:
   *
   * *null* bind expressJS application to default port (process.env.PORT)
   * or 3000 port, makes kabamKernel emit event of `started` with value
   * `{'type':'expressHttp', 'port':3000}`, returns kabamKernel
   *
   * *number* - bind expressJS application to this port,
   * makes kabamKernel emit event of `started` with value `{'type':'expressHttp', 'port':3001}`,
   * where 3001 is port number desired, and returns kabamKernel
   *
   * *string of 'app'* - start appliation as standalone object,
   * for background workers and console scripts,
   * makes kabamKernel emit event of `started` with value `{'type':'app'}`,
   * returns kabamKernel
   *
   * It emits events of "started"
   * @param {object} method - config object, see parameters in description
   *
   * @example
   * ```javascript
   *
   *   //different ways to bind application to 3000 port
   *   kabam.start('app');
   *   kabam.app.listen(3000);
   *
   *   kabam.start(); //binds to default port, 3000
   *
   *   kabam.start(3000); //binds to  port 3000
   *
   *   var http = require('http');
   *   kabam.start(http).listen(kabam.config.PORT);
   *
   *   //with socket.io
   *   //this is done in this way, because we can attach socket.io easily
   *   var http = require('http');
   *   var server = kabam.start(http);
   *   io = require('socket.io').listen(server);
   *   server.listen(kabam.config.PORT);
   *
   *   //setting up the https
   *   var https = require('https');
   *   kabam.start(https,{
   *     key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
   *     cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
   *   }).listen(kabam.app.get('port'));
   *
   * ```
   */
  start: function (method) {
    var _this = this;
    // rewriting all port configuration, port specified in start has highest priority
    if (typeof method === 'number') {
      this.config.PORT = method;
    }

    // composing the app
    this.compose();

    // launching the app
    if (method === 'app') {
      this.emit('started', { 'type': 'app' });
      return this;
    } else if (method && typeof method !== 'number') {
      throw new Error('Function Kabam#start() accepts null, "app" or port number as arguments!');
    }

    if (this.config.PORT < 0) {
      throw new Error('Invalid port number');
    }

    this.httpServer.listen(this.config.PORT, function () {
      _this.emit('started', {'port': _this.config.PORT, 'type': 'expressHttp'});
      logger.info(('KabamKernel started on ' + _this.config.PORT + ' port').blue);
    });

    return this;
  },
  /**
   * @ngdoc function
   * @name kabamKernel.startCluster
   * @description
   * Start kabam application as a cluster, with 1 process per CPU core.
   * This command start the process master by kabam.start('app') - so it do not listens to http port,
   * and the other ones as kabam.start(howExactly,options). When kabam is runned as cluster, it restarts killed processes
   * @param {object} howExactly - object, same as for kabam.start
   * Values:
   *
   * - null - bind expressJS application of worker process to default port (process.env.PORT) or 3000 port
   * - number - bind expressJS application of worker process to this port
   * - string of 'app' - start expressJS appliation of worker process as standalone object, for background workers and console scripts
   *
   * @returns {boolean} isMaster. Returns true, if this process is a master process of cluster, or false if this is slave process
   */
  startCluster: function (howExactly) {
    this._composed = true;

    var thisKabam = this,
      cluster = require('cluster'),
      numCPUs = require('os').cpus().length,
      maxWorkers,
      i;

    if (this.config.LIMIT_WORKERS && this.config.LIMIT_WORKERS > 0) {
      maxWorkers = Math.min(numCPUs, this.config.LIMIT_WORKERS);
    } else {
      maxWorkers = numCPUs;
    }


    if (cluster.isMaster) {
      logger.info(('Cluster : We have ' + numCPUs + ' CPU cores present. We can use ' + maxWorkers + ' of them.').bold.green);
      logger.info(('Cluster : Master PID#' + process.pid + ' is online').green);
      // Fork workers.
      for (i = 0; i < maxWorkers; i = i + 1) {
        var worker = cluster.fork();
        logger.info(('Cluster : Spawning worker with PID#' + worker.process.pid).green);
      }

      cluster.on('online', function (worker) {
        logger.info(('Cluster : Worker PID#' + worker.process.pid + ' is online').green);
      });

      cluster.on('exit', function (worker/*, code, signal*/) {
        var exitCode = worker.process.exitCode;
        logger.info(('Cluster : Worker #' + worker.process.pid + ' died (' + exitCode + '). Respawning...').yellow);
        cluster.fork();
      });

      thisKabam.start('app'); // the master process is ran as background application and do not listens to port
      return true;
    } else {
      thisKabam.start(howExactly);
      return false;
    }
  },
  /**
   * @ngdoc function
   * @name kabamKernel.extendListeners
   * @param {string} eventName Name of the event
   * @param {function} eventHandlerFunction Function to handle the event
   * @description - add custom event handler for Kabam
   * @example
   * ``` javascript
   *
   *      kabam.extendListeners('someEvent', console.log);
   *
   * ```
   * @returns {kabamKernel} kabam object
   */
  extendListeners: function (eventName, eventHandlerFunction) {
    if (typeof eventName === 'string' && typeof eventHandlerFunction === 'function') {
      this.on(eventName, eventHandlerFunction);
    } else {
      throw new Error('KabamKernel.extendListeners(eventName,eventHandlerFunction) have wrong arguments!');
    }
    return this;
  },


  /**
   * @ngdoc function
   * @name kabamKernel.injectEmit
   * @description
   * Injects a function .emit(eventName,eventObj) for every object. This function
   * is used for making this object to be able to emit events through Kabam
   * @param {object} object - object to be extended
   */
  injectEmit: function (object) {
    var thisKabam = this;
    object.emitKabam = function (eventName, eventContent) {
      thisKabam.emit(eventName, eventContent);
    };
  },


  /**
   * @ngdoc function
   * @name kabamKernel.stop
   * @description
   * Stops kabamKernel instance - close redis and mongo connections.
   */
  stop: function () {
    this.emit('stop');
    this.redisClient.end();
    this.mongoose.connection.close();
    this.mongoose.disconnect();
    this.removeAllListeners();
    return;
  }
};

KabamKernel.prototype.plugin = KabamKernel.prototype.usePlugin;

/**
 * @ngdoc function
 * @name kabamFactory
 * @description
 * Create Kabam object instance (factory) with se set of default plugins
 * @param {object} config - config object
 * @example
 * ```javascript
 * //minimal config object example
 *
 * var config = {
 *   "HOST_URL":"http://example.org/", //host url, can be guessed from environment
 *   "MONGO_URL":"mongodb://username:password@mongoServer:27017/databaseName", *   // valid MongoDB URL, can be guessed
 *   "SECRET":"LongAndHardSecretStringToPreventSessionHiJask", // can be guessed, but we recommend to set it
 * //"REDIS_URL": "redis://prefix:authPassword@redisServer:6379",  //url to redis server, can be omitted
 *
 * //"REDIS": {"host":"redisServer", "port":6379,"auth":"authPassword"},
 * //redis server parameters in different notation, can be omitted
 *
 *   "REDIS_URL": {"host":"localhost", "port":6379,"auth":""}, //default redis server values
 *   "DISABLE_CSRF" : false // disable CSRF protection for application
 *   //"IO":{'LOGLEVEL':1 }, //uncomment t his field to enable socket.io
 *   //'LIMIT_WORKERS': 2, //uncomment this string to set the max worker processes number the cluster spawn
 * };
 *
 * //minimal runnable example
 * var KabamKernel = require('kabam-kernel');
 * kabamKernel = kabam(config);
 * kabamKernel.start();
 *
 * ```
 */
function kabamFactory (config) {
  var kernel = new KabamKernel(config);
  // default plugins
  kernel.usePlugin(require('./core/logging'));
  kernel.usePlugin(require('./core/redis-client'));
  kernel.usePlugin(require('./core/mongoose'));
  kernel.usePlugin(require('./core/models/user'));
  kernel.usePlugin(require('./core/models/group'));
  kernel.usePlugin(require('./core/models/message'));
  kernel.usePlugin(require('./core/encrypt-decrypt'));
  kernel.usePlugin(require('./core/passport'));
  kernel.usePlugin(require('./core/strategies/facebook'));
  kernel.usePlugin(require('./core/strategies/github'));
  kernel.usePlugin(require('./core/strategies/google'));
  kernel.usePlugin(require('./core/strategies/hash'));
  kernel.usePlugin(require('./core/strategies/linkedin'));
  kernel.usePlugin(require('./core/strategies/local'));
  kernel.usePlugin(require('./core/strategies/twitter'));
  kernel.usePlugin(require('./core/app'));
  kernel.usePlugin(require('./core/socket-io'));
  kernel.usePlugin(require('./core/rate-limiter'));
  kernel.usePlugin(require('./core/toobusy'));
  kernel.usePlugin(require('./core/api'));

  return kernel;
}

// allow to get the kernel constructor itself
kabamFactory.KabamKernel = KabamKernel;

module.exports = kabamFactory;

/**
 * @ngdoc function
 * @name kabamKernel.on
 * @usage
 * kabamKernel.on('someEvent',function(payload){...});
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * Adds a listener to the end of the listeners array for the specified event.
 * See [official nodejs manual] (http://nodejs.org/api/events.html)
 *
 * There can be more event emmiters than in documentation. Probably from plugins and some 3rd party code.
 *
 * *Event emitted from user model*
 * [http://ci.monimus.com/docs/#/api/User.eventsEmitter](http://ci.monimus.com/docs/#/api/User.eventsEmitter)
 * [http://ci.monimus.com/docs/#/api/kabamKernel.model.User.eventsEmitter](http://ci.monimus.com/docs/#/api/kabamKernel.model.User.eventsEmitter)
 *
 * *Events emmited from starting application*
 * [http://ci.monimus.com/docs/#/api/kabamKernel.start](http://ci.monimus.com/docs/#/api/kabamKernel.start)
 *
 * *Event emmited from http server*
 * They have type of `http` and are like this:
 * ```javascript
 * {
 *   startTime: Wed Aug 21 2013 01:52:34 GMT+0400 (MSK),
 *   duration: 49,
 *   statusCode: 200,
 *   method: 'GET',
 *   ip: '127.0.0.1',
 *   uri: '/',
 *   username:'johndoe',
 *   email:'email'
 * }
 * ```
 *
 * More info on event listeners - [http://nodejs.org/api/events.html#events_emitter_on_event_listener](http://nodejs.org/api/events.html#events_emitter_on_event_listener)
 * @param {string} eventName - the name of event type
 * @param {function} handlerFunction - function used to process the event
 * @example
 * ```javascript
 *    kabamKernel.on('error', functon(error){ //this is standart event emitter
 *      console.error(error);
 *    });
 *
 *    //event emmited from starting application
 *    kabamKernel.on('started',function(parametes){...});
 *
 *    //event emmiters from users model
 *    kabamKernel.on('users:revokeRole', function(user){...});
 *    kabamKernel.on('users:signUp', function(user){...});
 *    kabamKernel.on('users:signUpByEmailOnly', function(user){...});
 *    kabamKernel.on('users:completeProfile', function(user){...});
 *    kabamKernel.on('users:saveProfile', function(user){...});
 *    kabamKernel.on('users:setKeyChain', function(user){...});
 *    kabamKernel.on('users:revokeKeyChain', function(user){...});
 *    kabamKernel.on('users:findOneByApiKeyAndVerify', function(user){...});
 *    kabamKernel.on('users:ban', function(user){...});
 *    kabamKernel.on('users:unban', function(user){...});
 * ```
 */

/**
 * @ngdoc function
 * @name kabamKernel.once
 * @usage
 * kabamKernel.once('someEvent',function(payload){...});
 * @description
 * Adds a one time listener for the event. This listener is invoked only the next time the event is fired, after which it is removed.
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual] (http://nodejs.org/api/events.html)
 * It works only once.
 * All things are identical to [http://ci.monimus.com/docs/#/api/kabamKernel.on](http://ci.monimus.com/docs/#/api/kabamKernel.on)
 * @param {string} eventName - the name of event type
 * @param {function} handlerFunction - function used to process the event
 */

/**
 * @ngdoc function
 * @name kabamKernel.addListener
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual] (http://nodejs.org/api/events.html#events_emitter_addlistener_event_listener)
 */

/**
 * @ngdoc function
 * @name kabamKernel.removeListener
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual](http://nodejs.org/api/events.html#events_emitter_removelistener_event_listener)
 */

/**
 * @ngdoc function
 * @name kabamKernel.removeAllListeners
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual] (http://nodejs.org/api/events.html#events_emitter_removealllisteners_event)
 */

/**
 * @ngdoc function
 * @name kabamKernel.setMaxListeners
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual] (http://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n)
 */

/**
 * @ngdoc function
 * @name kabamKernel.listeners
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual] (http://nodejs.org/api/events.html#events_emitter_listeners_event)
 */

/**
 * @ngdoc function
 * @name kabamKernel.emit
 * @description
 * kabamKernel inherits all methods, including this, from nodejs event emitter.
 * See [official nodejs manual](http://nodejs.org/api/events.html#events_emitter_emit_event_arg1_arg2)
 */
