'use strict';
var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  appManager = require('./lib/appManager.js'),
  configManager = require('./lib/configManager.js'),
  // jshint unused: false
  colors = require('colors');

/**
 * @ngdoc function
 * @name kabamKernel
 * @constructor
 * @param {object} config - config object
 */
function KabamKernel(config) {
  EventEmitter.call(this);
  this.config = config;

  var extendCoreFunctions = [],//privileged field
    extendAppFunctions = [],
    additionalModels = {},
    additionalStrategies = [],
    prepared = false,
    extendMiddlewareFunctions = [],
    extendRoutesFunctions = [],
    catchAllFunction,
    thisKabam = this;//http://www.crockford.com/javascript/private.html

  //privileged functions
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
   * @param {string} namespace  namespace to bind this field. default is 'shared;
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
  this.extendCore = function (fieldName, factory) {
    if (prepared) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }
    var extension, value;
    if(typeof fieldName === 'function'){
      factory = fieldName;
      fieldName = null;
    }

    if(!factory){
      throw new Error('KabamKernel.extendCore requires argument of fieldName(string), ' +
                      'and value - function(config){} or function!');
    }

    if (typeof factory !== 'function') {
      value = factory;
      factory = function(){return value;};
    }

    if(fieldName){
      extension = {'field': fieldName, 'factory': factory};
    } else {
      extension = factory;
    }

    extendCoreFunctions.push(extension);

    return this;
  };

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
  this.extendModel = function (name, factory) {
    if (prepared) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }

    if (typeof name === 'string' && typeof factory === 'function') {
      additionalModels[name] = factory;
    } else {
      throw new Error('KabamKernel.extendModel requires arguments of string of "name" and function(core){...}');
    }
    return this;
  };

  /**
   * @ngdoc function
   * @name kabamKernel.extendStrategy
   * @description
   * Loads new passportjs strategies from object
   * @param {object} strategyObject Passport's strategy object
   * @returns {kabamKernel} kabamKernel object
   * @url https://github.com/mykabam/kabam-kernel/blob/master/lib/strategies/github.js
   * @example
   * ```javascript
   *
   * kabam.extendStrategy({
   * 'strategy':function (core) {
   * return new LinkedInStrategy({
   *    consumerKey: core.config.passport.LINKEDIN_API_KEY,
   *    consumerSecret: core.config.passport.LINKEDIN_SECRET_KEY,
   *    callbackURL: core.config.HOST_URL + 'auth/linkedin/callback'
   *    }, function (token, tokenSecret, profile, done) {
   *       var email = profile.emails[0].value;
   *      if (email) {
   *        core.model.Users.linkEmailOnlyProfile(email,done);
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
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof strategyObject !== 'object') {
        throw new Error('kabam.extendStrategy requires strategyObject to be an object');
      }
      if (typeof strategyObject.strategy !== 'function') {
        throw new Error('kabam.extendStrategy requires strategyObject.strategy to be a proper function!');
      }
      if (typeof strategyObject.routes !== 'function') {
        throw new Error('kabam.extendStrategy requires strategyObject.routes to be a proper function!');
      }
      additionalStrategies.push(strategyObject);
      return this;
    }
  };

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
  this.extendApp = function (environment, settingsFunction) {
    if (prepared) {
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
            extendAppFunctions.push({
              'environment': environmentToUse[j],
              'settingsFunction': settingsFunction
            });
          }
        } else {
          extendAppFunctions.push({
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
  this.extendMiddleware = function (environment, path, settingsFunction) {
    if (prepared) {
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
            extendMiddlewareFunctions.push({
              'environment': environmentToUse[l],
              'path': pathToUse,
              'SettingsFunction': settingsFunctionToUse
            });
          }
        } else {
          //we set middleware for all environments
          extendMiddlewareFunctions.push({
            'path': pathToUse,
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        throw new Error('Wrong arguments for function KabamKernel.extendMiddleware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
      }
      return this;
    }
  };

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
  this.extendRoutes = function (settingsFunction) {
    if (prepared) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      if (typeof settingsFunction === 'function') {
        extendRoutesFunctions.push(settingsFunction);
      } else {
        throw new Error('Wrong argument for KabamKernel.extendAppRoutes(function(core){...});');
      }
      return this;
    }
  };

  /**
   * @ngdoc function
   * @name kabamKernel.catchAll
   * @description
   * Provides ability to add a "catch all" callback function that will be called only if no
   * middleware returned a response nor any route have been matched.
   * @param {function} catchAllFunction callback function
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
  this.catchAll = function (func) {
    if (prepared) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    }
    if (typeof func !== 'function') {
      throw new Error('Wrong argument for KabamKernel.catchAll(function(kernel){...});');
    }
    catchAllFunction = func;
  };

  /**
   * @ngdoc function
   * @name kabamKernel.usePlugin
   * @description
   * Loads plugin from object or npm module
   * @param {object/string} pluginObjectOrName - config object or plugin name to get by require
   * @url https://github.com/mykabam/kabam-kernel/blob/master/example/plugin.example.js
   */
  this.usePlugin = function (pluginObjectOrName) {
    if (prepared) {
      throw new Error('Kabam core application is already prepared! WE CAN\'T EXTEND IT NOW!');
    } else {
      var pluginToBeInstalled = {},
        field,
        i,
        y,
        x;
      if (typeof pluginObjectOrName === 'string') {
        pluginToBeInstalled = require(pluginObjectOrName);
      } else {
        pluginToBeInstalled = pluginObjectOrName;
      }

      if (typeof pluginToBeInstalled.name !== 'string' && !/^[a-z0-9_\-]+$/.test(pluginToBeInstalled.name) && pluginObjectOrName.name === 'shared') {
        throw new Error('Wrong plugin syntax. Plugin name is missed or have wrong syntax!');
      }

      if (typeof pluginToBeInstalled.core === 'object') {
        for (field in pluginToBeInstalled.core) {
          if (pluginToBeInstalled.core.hasOwnProperty(field)) {
            this.extendCore(field, pluginToBeInstalled.core[field], pluginToBeInstalled.name);
          }
        }
      }
      if (typeof pluginToBeInstalled.core === 'function') {
        this.extendCore(pluginToBeInstalled.core);
      }
      if (typeof pluginToBeInstalled.model === 'object') {
        for (x in pluginToBeInstalled.model) {
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

      if (pluginToBeInstalled.middleware !== undefined) {
        if (pluginToBeInstalled.middleware instanceof Array) {
          for (i = 0; i < pluginToBeInstalled.middleware.length; i = i + 1) {
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
        for (y in pluginToBeInstalled.listeners) {
          if (pluginToBeInstalled.listeners.hasOwnProperty(y)) {
            this.extendListeners(y, pluginToBeInstalled.listeners[y]);
          }
        }
      }

      return this;
    }
  };

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
  this.start = function (method) {
    prepared = true;

    // rewriting all port configuration, port specified in start has highest priority
    if(typeof method === 'number'){
      this.config.PORT = method;
    }

    // creating config
    this.config = configManager(this.config || {});

    //injecting mongoose and additional models

    extendCoreFunctions.map(function (extension) {
      if (thisKabam[extension.field]) {
        console.warn('Kernel namespace collision - kernel already have field named ' + extension.field);
      }
      var fields = {};
      if(typeof extension === 'function'){
        fields = extension(thisKabam);
      } else {
        fields[extension.field] = extension.factory(thisKabam.config);
      }

      if(typeof fields !== 'object'){
        throw new Error('Kernel extension function should return an object with name:value pairs, ' +
          'got '+typeof fields+' instead');
      }
      for(var f in fields){
        thisKabam[f] = fields[f];
      }
    });

    thisKabam.model = {};
    Object.keys(additionalModels).map(function(name){
      var schema = additionalModels[name](thisKabam);
      // TODO: maybe this should be done in the mongoose plugin
      // for now we just assume that mongoConnection is always present
      thisKabam.model[name] = thisKabam.mongoConnection.model(name, schema);
    });

    //initialize expressJS application
    thisKabam.app = appManager(thisKabam, extendAppFunctions, additionalStrategies, extendMiddlewareFunctions, extendRoutesFunctions, catchAllFunction);

    if (method === 'app') {
        thisKabam.emit('started', { 'type': 'app' });
        return thisKabam;
    } else if(method && typeof method !== 'number'){
      throw new Error('Function Kabam#start() accepts null, "app" or port number as arguments!');
    }

    if(thisKabam.config.PORT < 0){
      throw new Error('Invalid port number');
    }

    thisKabam.httpServer.listen(thisKabam.config.PORT, function () {
      thisKabam.emit('started', {'port': thisKabam.config.PORT, 'type': 'expressHttp'});
      console.log(('KabamKernel started on ' + thisKabam.config.PORT + ' port').blue);
    });

    return thisKabam;
  };
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
  this.startCluster = function (howExactly) {
    prepared = true;

    var thisKabam = this,
      cluster = require('cluster'),
      numCPUs = require('os').cpus().length,
      maxWorkers,
      i;

    if (this.config.LIMIT_WORKERS && this.config.LIMIT_WORKERS > 0) {
      maxWorkers  = Math.min(numCPUs, this.config.LIMIT_WORKERS);
    } else {
      maxWorkers = numCPUs;
    }


    if (cluster.isMaster) {
      console.log(('Cluster : We have ' + numCPUs + ' CPU cores present. We can use ' + maxWorkers + ' of them.').bold.green);
      console.log(('Cluster : Master PID#' + process.pid + ' is online').green);
      // Fork workers.
      for (i = 0; i < maxWorkers; i = i + 1) {
        var worker = cluster.fork();
        console.log(('Cluster : Spawning worker with PID#' + worker.process.pid).green);
      }

      cluster.on('online', function (worker) {
        console.log(('Cluster : Worker PID#' + worker.process.pid + ' is online').green);
      });

      cluster.on('exit', function (worker, code, signal) {
        var exitCode = worker.process.exitCode;
        console.log(('Cluster : Worker #' + worker.process.pid + ' died (' + exitCode + '). Respawning...').yellow);
        cluster.fork();
      });

      thisKabam.start('app'); // the master process is ran as background application and do not listens to port
      return true;
    } else {
      thisKabam.start(howExactly);
      return false;
    }
  };

  // default plugins
  this.usePlugin(require('./core/redis-client'));
  this.usePlugin(require('./core/mongoose'));
  this.usePlugin(require('./core/models/user'));
  this.usePlugin(require('./core/models/group'));
  this.usePlugin(require('./core/models/message'));
  this.usePlugin(require('./core/app'));
  this.usePlugin(require('./core/socket-io'));
  this.usePlugin(require('./core/rate-limiter'));
  this.usePlugin(require('./core/toobusy'));
}

util.inherits(KabamKernel, EventEmitter);


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
KabamKernel.prototype.extendListeners = function (eventName, eventHandlerFunction) {
  if (typeof eventName === 'string' && typeof eventHandlerFunction === 'function') {
    this.on(eventName, eventHandlerFunction);
  } else {
    throw new Error('KabamKernel.extendListeners(eventName,eventHandlerFunction) have wrong arguments!');
  }
  return this;
};


/**
 * @ngdoc function
 * @name kabamKernel.injectEmit
 * @description
 * Injects a function .emit(eventName,eventObj) for every object. This function
 * is used for making this object to be able to emit events through Kabam
 * @param {object} object - object to be extended
 */
KabamKernel.prototype.injectEmit = function (object) {
  var thisKabam = this;
  object.emitKabam = function (eventName, eventContent) {
    thisKabam.emit(eventName, eventContent);
  };
};


/**
 * @ngdoc function
 * @name kabamKernel.create
 * @description
 * Create Kabam object instance (factory)
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
KabamKernel.create = function (config) {
  return new KabamKernel(config);
};

/**
 * @ngdoc function
 * @name kabamKernel.stop
 * @description
 * Stops kabamKernel instance - close redis and mongo connections.
 */
KabamKernel.prototype.stop = function () {
  this.emit('stop');
  this.redisClient.end();
  this.mongoose.connection.close();
  this.mongoose.disconnect();
  this.removeAllListeners();
  return;
};

module.exports = exports = KabamKernel.create;

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
