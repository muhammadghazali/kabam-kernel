var EventEmitter = require('events').EventEmitter,
  path = require('path'),
  url = require('url'),
  async = require('async'),
  util = require('util'),
  express = require('express'),
  mongooseManager = require('./lib/mongooseManager'),
  redisManager = require('./lib/redisManager'),

  usersModel = require('./models/Users.js'),

  http = require('http'),
  https = require('https'),
//passport middleware
  passport = require('passport'),
  initPassport = require('./lib/passport/initPassport.js'),

//session storage
  RedisStore = require('connect-redis')(express),
//todo
//https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/
  flashMiddleware = require('connect-flash'),

  toobusy = require('toobusy');

function MWC(config) {
  if(typeof config !== 'object'){
    throw new Error('Config is not an object!');
  }
  if(!(config.hostUrl && url.parse(config.hostUrl)['hostname'])){
    throw new Error('Config.hostUrl have to be valid hostname - for example, http://example.org/ with http(s) on start and "/" at end!!!');
  }

  if(!(config.secret && config.secret.length>9)){
    throw new Error('Config.secret is not set or is to short!');
  }

  mongooseManager.validateConfig(config.mongoUrl);
  redisManager.validateConfig(config.redis);

  EventEmitter.call(this);
  this.config = config;
  this.extendCoreFunctions = [];
  this.additionalModels = [];
  this.extendAppFunctions = [];
  this.extendMiddlewaresFunctions = [];
  this.extendRoutesFunctions = [];
  return this;
}

util.inherits(MWC, EventEmitter);

//extending application
MWC.prototype.extendCore = function (settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    if (typeof settingsFunction === 'function') {
      this.extendCoreFunctions.push(settingsFunction);
      return this;
    } else {
      throw new Error('MWC.extendCore requires argument of function(core){...}');
    }
  }
};

MWC.prototype.extendModel = function (modelName, modelFunction) {
  if (modelName === 'Users') {
    throw new Error('Error extending model, "Users" is reserved name');
  } else {
    if (typeof modelName === 'string' && typeof modelFunction === 'function') {
      this.additionalModels.push({'name': modelName, 'initFunction': modelFunction});
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
          this.extendAppFunctions.push({
            'environment': environmentToUse[i],
            'settingsFunction': settingsFunction
          });
        }
      } else {
        this.extendAppFunctions.push({
          'settingsFunction': settingsFunction
        });
      }
    } else {
      throw new Error('Wrong arguments for extendApp(arrayOrStringOfEnvironments,settingsFunction)');
    }
    return this;
  }
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
          this.extendMiddlewaresFunctions.push({
            'environment': environmentToUse[i],
            'path': pathToUse,
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        //we set middleware for all environments
        this.extendMiddlewaresFunctions.push({
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
      this.extendRoutesFunctions.push(settingsFunction);
      return this;
    } else {
      throw new Error('Wrong argument for MWC.extendAppRoutes(function(core){...});');
    }
  }
};

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

MWC.prototype.ready = function () {
  var thisMWC = this;//because we sometimes issue closures with thisMWC
  thisMWC.prepared = true;

  //injecting redis
  thisMWC.redisClient = redisManager.create(thisMWC.config.redis);

  //injecting default mongoose databases
  thisMWC.mongoose = mongooseManager.create(thisMWC.config.mongoUrl);

  var db = thisMWC.mongoose.connection;
  db.on('connect', function (err) {
    if (err) {
      thisMWC.emit('error', err);
    } else {
      console.log('Mongo connection established!');
      thisMWC.emit('mongoReady');
    }
  });
  db.on('error', function (err) {
    thisMWC.emit('error', err);
  });

  var Users = usersModel(thisMWC);

  thisMWC.model = {
    'Users': Users
  };

  //doing extendCore
  //extending core by extendCore
  thisMWC.extendCoreFunctions.map(function (settingsFunction) {
    settingsFunction(thisMWC);
  });

  //loading custom models //todo - maybe redo
  thisMWC.additionalModels.map(function (customModel) {
    thisMWC.model[customModel.name] = customModel.initFunction(thisMWC.mongoose, thisMWC.config);
  });

  //setting passport
  initPassport.doInitializePassportStrategies(passport, Users, thisMWC.config);

  //start vendoring expressJS application
  thisMWC.app = express();

  thisMWC.app.set('port', process.env.PORT || 3000);

//too busy middleware which blocks requests when we're too busy
  thisMWC.app.use(function (req, res, next) {
    if (toobusy()) {
      res.send(503, 'I am busy right now, sorry.');
    } else {
      next();
    }
  });
  thisMWC.app.configure('development', function () {
    console.log('Development environment!');
    thisMWC.app.use(express.responseTime());
    thisMWC.app.use(express.logger('dev'));
    thisMWC.app.locals.development = true;
  });

  thisMWC.app.configure('staging', function () {
    console.log('Staging environment!');
    thisMWC.app.locals.staging = true;
    thisMWC.app.use(express.responseTime());
    thisMWC.app.enable('view cache');
    thisMWC.app.use(express.logger('dev'));
  });

  thisMWC.app.configure('production', function () {
    console.log('Production environment!');
    thisMWC.app.locals.production = true;
    thisMWC.app.enable('view cache');
    thisMWC.app.use(express.logger('short'));
  });

  //doing setAppParameters
  //extend vendored application settings
  thisMWC.extendAppFunctions.map(function (func) {
    if (func.environment) {
      thisMWC.app.configure(func.environment, function () {
        func.settingsFunction(thisMWC);
      });
    } else {
      if (func && func.settingsFunction) {
        func.settingsFunction(thisMWC);
      }
    }
  });

  thisMWC.app.use(express.compress());
  thisMWC.app.use(express.favicon());
  thisMWC.app.use(express.bodyParser());
  thisMWC.app.use(express.methodOverride());
  thisMWC.app.use(express.cookieParser(thisMWC.config.secret));
  thisMWC.app.use(express.session({
    secret: thisMWC.config.secret,
    store: new RedisStore({prefix: 'mwc_core_'}),//todo - client session store
    expireAfterSeconds: 180,
    httpOnly: true
  }));
  thisMWC.app.use(express.csrf());
  thisMWC.app.use(flashMiddleware());
  thisMWC.app.use(passport.initialize());
  thisMWC.app.use(passport.session());


  //injecting default internals via middleware
  thisMWC.app.use(function (request, response, next) {
    if(request.session && request.session._csrf){
      thisMWC.app.locals.csrf = request.session._csrf;
    }
    if(request.user){
      thisMWC.app.locals.myself = request.user; //inject user's model values to template
    }
    thisMWC.app.locals.flash = request.flash();
    thisMWC.app.locals.hostUrl = thisMWC.config.hostUrl;
    request.model = thisMWC.model;
    request.redisClient = thisMWC.redisClient;
    request.emitMWC = function (eventName, eventContent) {
      thisMWC.emit(eventName, eventContent);
    };
    next();
  });

  //doing setAppMiddleware
  //extend vendored application middlewares settings
  thisMWC.extendMiddlewaresFunctions.map(function (middleware) {
    if (middleware.environment) {
      thisMWC.app.configure(middleware.environment, function () {
        thisMWC.app.use(middleware.path, middleware.SettingsFunction(thisMWC));
      });
    } else {
      thisMWC.app.use(middleware.path, middleware.SettingsFunction(thisMWC));
    }
  });

  //initialize router middleware!!!
  thisMWC.app.use(thisMWC.app.router);
  //initialize router middleware!!!


  //setting error handler middlewares, after ROUTER middleware,
  // so we can simply throw errors in routes and they will be catch here!
  thisMWC.app.configure('development', function () {
    thisMWC.app.use(express.errorHandler());
  });

  thisMWC.app.configure('staging', function () {
    thisMWC.app.use(function (err, req, res, next) {
      thisMWC.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.json(err);
    });
  });

  thisMWC.app.configure('production', function () {
    thisMWC.app.use(function (err, req, res, next) {
      thisMWC.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
  });
  //middleware setup finished. adding routes

  //doing setAppRoutes
  thisMWC.extendRoutesFunctions.map(function (func) {
    func(thisMWC);
  });

  //set authorization routes for passport
  initPassport.doInitializePassportRoutes(passport, thisMWC.app, thisMWC.config);

  //catch all verb to show 404 error to wrong routes
  thisMWC.app.get('*', function (request, response) {
    response.send(404);
  });

  process.on('SIGINT', function () {
    console.log('MWC IS GOING TO SHUT DOWN....')
    thisMWC.mongoose.connection.close();
    // calling .shutdown allows your process to exit normally
    toobusy.shutdown();
    process.exit();
  });

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


MWC.create = function(config){
  return new MWC(config);
};

module.exports = exports = MWC.create;
