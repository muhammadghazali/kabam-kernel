var EventEmitter = require('events').EventEmitter,
  path = require('path'),
  url = require('url'),
  async = require('async'),
  util = require('util'),
  express = require('express'),

  mongoose = require('mongoose'),
  redis = require('redis'),

  usersModel = require('./models/USERS.js'),
  documentsModel = require('./models/DOCUMENTS.js'),

  http = require('http'),
  https = require('https'),
//passport middleware
  passport = require('passport'),
  initPassport = require('./passport/initPassport.js'),

//session storage
  RedisStore = require('connect-redis')(express),
//todo
//https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/


  flashMiddleware = require('connect-flash'),

  usersController = require('./routes/usersController.js'),
  documentsController = require('./routes/documentsController.js'),

  toobusy = require('toobusy');

function MWC(config) {
  EventEmitter.call(this);
  this.config = config;
  this.setCoreFunctions = [];
  this.additionalModels = [];
  this.setAppParametersFunctions = [];
  this.setAppMiddlewaresFunctions = [];
  this.setAppRoutesFunctions = [];
  return this;
}

util.inherits(MWC, EventEmitter);

//extending application
MWC.prototype.extendCore = function (settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    if (typeof settingsFunction === 'function') {
      this.setCoreFunctions.push(settingsFunction);
      return this;
    } else {
      throw new Error('MWC.extendCore requires argument of function(core){...}');
    }
  }
};

MWC.prototype.extendModel = function (modelName, modelFunction) {
  if (modelName === 'Users' || modelName === 'Documents') {
    throw new Error('Error extending model, "Users" and "Documents" are reserved names');
  } else {
    if (typeof modelName === 'string' && typeof modelFunction === 'function') {
      this.additionalModels.push({'name': modelName, 'initFunction': modelFunction});
      return this;
    } else {
      throw new Error('MWC.extendModel requires arguments of string of "modelName" and function(core){...}');
    }
  }
};

MWC.prototype.setAppParameters = function (environment, settingsFunction) {
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
          throw new Error('#MWC.setAppParameters requires environment name to be a string!');
        }
      }
    }
    if (typeof settingsFunction === 'function') {
      if (environmentToUse) {
        for (var i = 0; i < environmentToUse.length; i++) {
          this.setAppParametersFunctions.push({
            'environment': environmentToUse[i],
            'settingsFunction': settingsFunction
          });
        }
      } else {
        this.setAppParametersFunctions.push({
          'settingsFunction': settingsFunction
        });
      }
    } else {
      throw new Error('Wrong arguments for setAppParameters');
    }
    return this;
  }
};

MWC.prototype.setAppMiddlewares = function (environment, path, settingsFunction) {
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
            throw new Error('#MWC.setAppParameters requires environment name to be a string!');
          }
        }
      }
      if (typeof path === 'string' && /^\//.test(path)) {
        pathToUse = path;
        if (typeof settingsFunction === 'function') {
          settingsFunctionToUse = settingsFunction;
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
          this.setAppMiddlewaresFunctions.push({
            'environment': environmentToUse[i],
            'path': pathToUse,
            'SettingsFunction': settingsFunctionToUse
          });
        }
      } else {
        //we set middleware for all environments
        this.setAppMiddlewaresFunctions.push({
          'path': pathToUse,
          'SettingsFunction': settingsFunctionToUse
        });
      }
    } else {
      throw new Error('Wrong arguments for function MWC.setAppMiddlware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    }
    return this;
  }
};

MWC.prototype.extendAppRoutes = function (settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    if (typeof settingsFunction === 'function') {
      this.setAppRoutesFunctions.push(settingsFunction);
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
    if (pluginToBeInstalled.setAppParameters) {
      this.setAppParameters(pluginToBeInstalled.setAppParameters);
    }
    if (pluginToBeInstalled.setAppMiddlewares) {
      this.setAppMiddlewares(pluginToBeInstalled.setAppMiddlewares);
    }
    if (pluginToBeInstalled.extendAppRoutes) {
      this.extendAppRoutes(pluginToBeInstalled.extendAppRoutes);
    }
    return this;
  }
};

MWC.prototype.ready = function () {
  var thisMWC = this;//because we sometimes issue closures with thisMWC
  thisMWC.prepared = true;

  //injecting redis
  if (thisMWC.config.redis) {
    if (typeof thisMWC.config.redis === 'object') {
      if (thisMWC.config.redis.port && !(/^[0-9]+$/.test(thisMWC.config.redis.port))) {
        throw new Error('Config variable of redis has bad value for PORT. Proper values are ' +
          '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
          'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"');
      }
      thisMWC.redisClient = redis.createClient(thisMWC.config.redis.port, thisMWC.config.redis.host);
      if (typeof thisMWC.config.redis.auth === 'string') {
        thisMWC.redisClient.auth(thisMWC.config.redis.auth);
      }
    } else {
      if (typeof thisMWC.config.redis === 'string') {
        var redisConfigUrlParsed = url.parse(thisMWC.config.redis);
        if (redisConfigUrlParsed) {
          thisMWC.redisClient = redis.createClient(redisConfigUrlParsed.port, redisConfigUrlParsed.hostname);
          if (redisConfigUrlParsed.auth && redisConfigUrlParsed.auth.split(':')[1]) {
            thisMWC.redisClient.auth(redisConfigUrlParsed.auth.split(':')[1]);
          }
        } else {
          throw new Error('Config variable of redis has bad value. Proper values are ' +
            '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
            'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"');
        }
      } else {
        throw new Error('Config variable of redis has bad value. Proper values are ' +
          '{"port":6379,"host":"localhost","auth":"someSecretPassword"} ' +
          'or "redis://usernameIgnored:someSecretPassword@redis.example.org:6739"');
      }
    }
  } else {
    //redis is NOT configured, we use default properties
    thisMWC.redisClient = redis.createClient();
  }
  //sanity check for mongoUrl
  if (!thisMWC.config.mongoUrl) {
    throw new Error('Config variable of mongoURL is missed!');
  }
  if(!url.parse(thisMWC.config.mongoUrl)){
    throw new Error('Config variable of mongoURL have wrong syntax. Good one is mongodb://username:somePassword@localhost:10053/mwc_dev');
  }
  //injecting default mongoose databases
  thisMWC.mongoose = mongoose.connect(thisMWC.config.mongoUrl);
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
  var Users = usersModel(thisMWC.mongoose, thisMWC.config);
  var Documents = documentsModel(thisMWC.mongoose, thisMWC.config);

  thisMWC.MODEL = {
    'Users': Users,
    'Documents': Documents
  };
  //doing extendCore
  //extending core by extendCore
  thisMWC.setCoreFunctions.map(function (settingsFunction) {
    settingsFunction(thisMWC);
  });

  //loading custom models
  thisMWC.additionalModels.map(function (customModel) {
    thisMWC.MODEL[customModel.name] = customModel.initFunction(thisMWC.mongoose, thisMWC.config);
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
  thisMWC.setAppParametersFunctions.map(function (func) {
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

  thisMWC.app.use(express.static(path.join(__dirname, 'public')));//static assets, maybe we need to set is as a plugin

  //injecting default internals via middleware
  thisMWC.app.use(function (request, response, next) {
    request.MODEL = thisMWC.MODEL;
    request.redisClient = thisMWC.redisClient;
    request.emitMWC = function (eventName, eventContent) {
      thisMWC.emit(eventName, eventContent);
    };
    next();
  });

  //doing setAppMiddleware
  //extend vendored application middlewares settings
  thisMWC.setAppMiddlewaresFunctions.map(function (middleware) {
    if (middleware.environment) {

      thisMWC.app.configure(middleware.environment, function () {
        thisMWC.app.use(((middleware.path) ? (middleware.path) : '/'), middleware.SettingsFunction(thisMWC));
      });

    } else {

      thisMWC.app.use(((middleware.path) ? (middleware.path) : '/'), middleware.SettingsFunction(thisMWC));

    }
  });

  //initialize router middleware!!!
  thisMWC.app.use(thisMWC.app.router);
  //initialize router middleware!!!


  //setting error handler middlewares, after ROUTER middleware
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
  thisMWC.setAppRoutesFunctions.map(function (func) {
    func(thisMWC);
  });

  //setting up the default routes
  usersController(thisMWC.app, thisMWC.config);//restfull api for users
  documentsController(thisMWC.app, thisMWC.config);//restfull api for documents

  //autorize routes for passport
  initPassport.doInitializePassportRoutes(passport, thisMWC.app, thisMWC.config);

  //catch all verb to show 404 error to wrong routes
  thisMWC.app.get('*', function (request, response) {
    response.send(404);
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

process.on('SIGINT', function () {
  //server.close(); //server is instantained somewere else...
  // calling .shutdown allows your process to exit normally
  toobusy.shutdown();
  process.exit();
});

module.exports = exports = MWC;
