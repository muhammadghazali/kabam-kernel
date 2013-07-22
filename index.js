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
    this.setCoreFunctions.push(settingsFunction);
    return this;
  }
};

MWC.prototype.setAppParameters = function (environment, settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    var environmentToUse = null;
    if (typeof settingsFunction === 'undefined') {
      settingsFunction = environment;
    }
    if (typeof environment === 'string') {
      environmentToUse = [];
      environmentToUse.push(environment);
    }
    if (environment instanceof Array) {
      environmentToUse = environment;
    }
    if (environmentToUse) {
      for (var i = 0; i < environmentToUse.length; i++) {
        this.setAppParametersFunctions.push({
          'environment': environmentToUse[i],
          'settingsFunction': settingsFunction
        });
      }
    } else {
      this.setAppParametersFunctions.push({
        'SettingsFunction': settingsFunction
      });
    }

    return this;
  }
};

MWC.prototype.setAppMiddlewares = function (environment, settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    //todo - add path to implement middleware
    var environmentToUse = null;
    if (typeof settingsFunction === 'undefined') {
      settingsFunction = environment;
    }
    if (typeof environment === 'string') {
      environmentToUse = [];
      environmentToUse.push(environment);
    }
    if (environment instanceof Array) {
      environmentToUse = environment;
    }
    if (environmentToUse) {
      for (var i = 0; i < environmentToUse.length; i++) {
        this.setAppMiddlewaresFunctions.push({
          'enviroment': environmentToUse[i],
          'SettingsFunction': settingsFunction
        });
      }
    } else {
      this.setAppMiddlewaresFunctions.push({
        'SettingsFunction': settingsFunction
      });
    }
    return this;
  }
};

MWC.prototype.extendAppRoutes = function (settingsFunction) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    this.setAppRoutesFunctions.push(settingsFunction);
    return this;
  }
};

MWC.prototype.usePlugin = function (pluginObjectOrName) {
  if (this.prepared) {
    throw new Error('MWC core application is already prepared! WE CAN\'T EXTEND IT NOW!');
  } else {
    var pluginToBeInstalled = {};
    if (typeof pluginObjectOrName === 'string') {
      //this is plugin name
      pluginToBeInstalled = require('' + pluginObjectOrName);
//
//      console.log('===');
//      console.log(pluginObjectOrName)
//      console.log(typeof pluginObjectOrName)
//      console.log(pluginToBeInstalled);
//      console.log('===');
//
    } else {
      pluginToBeInstalled = pluginObjectOrName;
    }

    if (pluginToBeInstalled.extendCore) {
      this.extendCore(pluginToBeInstalled.extendCore);
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
  var thisMWC = this;
  thisMWC.prepared = true;

  //injecting redis
  if (thisMWC.config.redis) {
    thisMWC.redisClient = redis.createClient(thisMWC.config.redis.port, thisMWC.config.redis.host);
  }
  else {
    thisMWC.redisClient = redis.createClient();
  }
  //injecting default mongoose databases
  thisMWC.mongoose = mongoose.connect(thisMWC.config.mongoUrl);
  var db = thisMWC.mongoose.connection;
  db.on('connect', function (err) {
    if (err) {
      thisMWC.emit('error', err);
    } else {
      console.log('Mongo connection established!');
      thisMWC.emit('ready');
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
  });

  thisMWC.app.configure('staging', function () {
    console.log('Staging environment!');
    thisMWC.app.use(express.responseTime());
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
      func.settingsFunction(thisMWC);
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

  thisMWC.app.configure('development', function () {
    thisMWC.app.use(express.errorHandler());
  });

  //injecting default internals via middleware
  thisMWC.app.use(function (request, response, next) {
    request.MODEL = {
      'Users': Users,
      'Documents': Documents
    };
    request.redisClient = thisMWC.redisClient;
    request.emitMWC = function (eventName, eventContent) {
      thisMWC.emit(eventName, eventContent);
    };
    next();
  });

  //doing setAppMiddleware
  //extend vendored application middlewares settings
  thisMWC.setAppMiddlewaresFunctions.map(function (middleware) {
    if (middleware.enviroment) {
      thisMWC.app.configure(middleware.enviroment, function () {
        thisMWC.app.use(middleware.SettingsFunction(thisMWC));
      });
    } else {
      thisMWC.app.use(middleware.SettingsFunction(thisMWC));
    }
  });

  thisMWC.app.configure('development', function () {
    thisMWC.app.use(express.errorHandler());
  });

  thisMWC.app.configure('production', function () {
    thisMWC.app.use(function (err, req, res, next) {
      thisMWC.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
  });

  //doing setAppRoutes
  thisMWC.setAppRoutesFunctions.map(function (func) {
    func(thisMWC);
  });

  //setting up the default routes
  usersController(thisMWC.app, thisMWC.config);//restfull api for users
  documentsController(thisMWC.app, thisMWC.config);//restfull api for users

  thisMWC.app.configure('development', function () {
    //default route to show plugins installed
    thisMWC.app.get('/plugins', function (request, response) {
      response.json(thisMWC.plugins);
    });
  });

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
      httpOrHttpsOrPort.createcreateServer(this.app).listen(this.app.get('port'));
      return;
    }
    throw new Error('Function MWC.listen(httpOrHttpsOrPort) accepts objects of null, http, https or port\'s number as argument!');
  } else {
    this.app.listen(this.app.get('port'));
  }
};

//transfer to separate pluggin...
MWC.prototype.populateDatabase = function (data) {
  console.log('Populating the database');
  if (data.users && data.users instanceof Array) {
    console.log(data.users);
    for (var i = 0; i < data.users.length; i++) {//todo - get some rest and make it via async.parallel - Anatolij
      console.log(data.users[i]);
      this.MODEL.Users.create(data.users[i], function (err, userSaved) {
        if (err) {
          throw err;
        }
        console.log(userSaved);
      });
    }
  }
};

process.on('SIGINT', function () {
  //server.close(); //server is instantained somewere else...
  // calling .shutdown allows your process to exit normally
  toobusy.shutdown();
  process.exit();
});

module.exports = exports = MWC;
