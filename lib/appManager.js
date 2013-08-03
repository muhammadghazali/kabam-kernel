/** @module appManager */
var express = require('express'),
  toobusy = require('toobusy'),
//passport middleware
  passport = require('passport'),
  initPassport = require('./passport/initPassport.js'),
//session storage
  RedisStore = require('connect-redis')(express),
//todo
//https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/
  flashMiddleware = require('connect-flash');

var appManager = {};

appManager.create = function(config, mwc) {

  //setting passport
  initPassport.doInitializePassportStrategies(passport, mwc.model.Users, config);

  var app = express();

  app.set('port', process.env.PORT || 3000);

  //too busy middleware which blocks requests when we're too busy
  app.use(function (req, res, next) {
    if (toobusy()) {
      res.send(503, 'I am busy right now, sorry.');
    } else {
      next();
    }
  });

  app.configure('development', function () {
    console.log('Development environment!');
    app.use(express.responseTime());
    app.use(express.logger('dev'));
    app.locals.development = true;
  });

  app.configure('staging', function () {
    console.log('Staging environment!');
    app.locals.staging = true;
    app.use(express.responseTime());
    app.enable('view cache');
    app.use(express.logger('dev'));
  });

  app.configure('production', function () {
    console.log('Production environment!');
    app.locals.production = true;
    app.enable('view cache');
    app.use(express.logger('short'));
  });

  return app;
};

appManager.extendApp = function(mwc) {
  var app = mwc.app;
  //doing setAppParameters
  //extend vendored application settings
  mwc.extendAppFunctions.map(function (func) {
    if (func.environment) {
      app.configure(func.environment, function () {
        func.settingsFunction(mwc);
      });
    } else {
      if (func && func.settingsFunction) {
        func.settingsFunction(mwc);
      }
    }
  });

  app.use(express.compress());
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(mwc.config.secret));
  app.use(express.session({
    secret: mwc.config.secret,
    store: new RedisStore({ prefix: 'mwc_core_', client: mwc.redisClient }),
    expireAfterSeconds: 180,
    httpOnly: true
  }));
  app.use(express.csrf());
  app.use(flashMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  //injecting default internals via middleware
  app.use(function (request, response, next) {
    if(request.session && request.session._csrf){
      app.locals.csrf = request.session._csrf;
    }
    if(request.user){
      app.locals.myself = request.user; //inject user's model values to template
    }
    app.locals.flash = request.flash();
    app.locals.hostUrl = mwc.config.hostUrl;
    request.model = mwc.model;
    request.redisClient = mwc.redisClient;
    mwc.injectEmit(request);
    next();
  });

  //doing setAppMiddleware
  //extend vendored application middlewares settings
  mwc.extendMiddlewaresFunctions.map(function (middleware) {
    if (middleware.environment) {
      app.configure(middleware.environment, function () {
        app.use(middleware.path, middleware.SettingsFunction(mwc));
      });
    } else {
      app.use(middleware.path, middleware.SettingsFunction(mwc));
    }
  });

  //initialize router middleware!!!
  app.use(app.router);
  //initialize router middleware!!!

  //setting error handler middlewares, after ROUTER middleware,
  // so we can simply throw errors in routes and they will be catch here!
  app.configure('development', function () {
    app.use(express.errorHandler());
  });

  app.configure('staging', function () {
    app.use(function (err, req, res, next) {
      mwc.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.json(err);
    });
  });

  app.configure('production', function () {
    app.use(function (err, req, res, next) {
      mwc.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
  });
  //middleware setup finished. adding routes

  //doing setAppRoutes
  mwc.extendRoutesFunctions.map(function (func) {
    func(mwc);
  });

  //set authorization routes for passport
  initPassport.doInitializePassportRoutes(passport, app, mwc.config);

  //catch all verb to show 404 error to wrong routes
  app.get('*', function (request, response) {
    response.send(404);
  });

  return app;
};

module.exports = exports = appManager;
