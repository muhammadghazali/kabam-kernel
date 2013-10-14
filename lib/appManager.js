/** @module appManager */
'use strict';
var express = require('express'),
//passport middleware
  Passport = require('passport').Passport,
  PassportManager = require('./PassportManager.js'),
//todo
//https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/
  http = require('http');


module.exports = function (kabam, _extendAppFunctions, _additionalStrategies, _extendMiddlewareFunctions, _extendRoutesFunctions, _catchAllFunction) {

  var passport = new Passport(),
    passportManager = new PassportManager();
  //setting always working strategies

  passportManager.useStrategy(require('./strategies/local.js'));
  passportManager.useStrategy(require('./strategies/google.js'));
  passportManager.useStrategy(require('./strategies/hash.js'));

  //setting default strategies
  if (kabam.config.PASSPORT) {
    if (kabam.config.PASSPORT.FACEBOOK_APP_ID && kabam.config.PASSPORT.FACEBOOK_APP_SECRET) {
      passportManager.useStrategy(require('./strategies/facebook.js'));
    }
    if (kabam.config.PASSPORT.GITHUB_CLIENT_ID && kabam.config.PASSPORT.GITHUB_CLIENT_SECRET) {
      passportManager.useStrategy(require('./strategies/github.js'));
    }
    if (kabam.config.PASSPORT.LINKEDIN_API_KEY && kabam.config.PASSPORT.LINKEDIN_SECRET_KEY) {
      passportManager.useStrategy(require('./strategies/linkedin.js'));
    }
    if (kabam.config.PASSPORT.TWITTER_CONSUMER_KEY && kabam.config.PASSPORT.TWITTER_CONSUMER_SECRET) {
      passportManager.useStrategy(require('./strategies/twitter.js'));
    }
  }
  //applying strategies needed by kabam.extendStrategies()
  _additionalStrategies.map(passportManager.useStrategy);
  //setting passport
  passportManager.doInitializePassportStrategies(passport, kabam);
  kabam.passport = passport;
  kabam.app = express();
  kabam.httpServer = http.createServer(kabam.app);
  kabam.app.locals.css = [];
  kabam.app.locals.javascripts = [];
  kabam.app.set('env', kabam.config.ENV);


  //start configuring middlewares
  kabam.app.enable('trust proxy');


  //doing setAppParameters
  //extend vendored application settings
  _extendAppFunctions.map(function (func) {
    if (func.environment) {
      kabam.app.configure(func.environment, function () {
        func.settingsFunction(kabam);
      });
    } else {
      if (func && func.settingsFunction) {
        func.settingsFunction(kabam);
      }
    }
  });


  //doing setAppMiddleware
  //extend vendored application middlewares settings
  _extendMiddlewareFunctions.map(function (middleware) {
    var settingFunction = middleware.SettingsFunction(kabam);
    // skip if no middleware component returned, for example if plugin guard middleware component with condition
    if(!settingFunction){return;}
    if (middleware.environment) {
      kabam.app.configure(middleware.environment, function () {
        kabam.app.use(middleware.path, settingFunction);
      });
    } else {
      kabam.app.use(middleware.path, settingFunction);
    }
  });


  //initialize router middleware!!!
  kabam.app.use(kabam.app.router);
  //initialize router middleware!!!


  //middleware setup finished. adding routes

  //doing setAppRoutes
  _extendRoutesFunctions.map(function (func) {
    func(kabam);
  });

  //set authorization routes for passport
  passportManager.doInitializePassportRoutes(passport, kabam);

  //display all expressjs routes present for this application
  //http://expressjs.com/api.html#app.routes
  kabam.app.get('/api/routes', function (request, response) {
    response.json(kabam.app.routes);
  });
  //catch all verb to show 404 error to wrong routes
  kabam.app.get('*', function (request, response) {
    if (_catchAllFunction) {
      _catchAllFunction(kabam)(request, response);
    } else {
      response.send(404);
    }
  });

  return kabam.app;
};
