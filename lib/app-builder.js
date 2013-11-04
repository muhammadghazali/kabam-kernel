/** @module appManager */
'use strict';
var express = require('express'),
//todo
//https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/
  http = require('http');


module.exports = function (
  kabam,
  extendCoreFunctions,
  extendAppFunctions,
  extendMiddlewareFunctions,
  extendRoutesFunctions,
  catchAllFunction)
{

  var httpLogger = kabam.logging.getLogger('http', module);

  //injecting mongoose and additional models

  extendCoreFunctions.map(function (extension) {
    if (kabam[extension.field]) {
      console.warn('Kernel namespace collision - kernel already have field named ' + extension.field);
    }
    var fields = {};
    if(typeof extension === 'function'){
      fields = extension(kabam) || {};
    } else {
      fields[extension.field] = extension.factory(kabam.config);
    }

    if(typeof fields !== 'object'){
      throw new Error('Kernel extension function should return an object with name:value pairs, ' +
        'got '+typeof fields+' instead');
    }
    for(var f in fields){
      kabam[f] = fields[f];
    }
  });


  kabam.app = express();
  kabam.httpServer = http.createServer(kabam.app);
  kabam.app.locals.css = [];
  kabam.app.locals.javascripts = [];
  kabam.app.set('env', kabam.config.ENV);

  //start configuring middlewares
  kabam.app.enable('trust proxy');

  //doing setAppParameters
  //extend vendored application settings
  extendAppFunctions.map(function (func) {
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
  extendMiddlewareFunctions.map(function (middleware) {
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

  // use router before error handling middleware components
  kabam.app.use(kabam.app.router);

  // TODO: add ability for plugins to define their own error handlers

  // setting error handler middleware, after ROUTER middleware,
  // so we can simply throw errors in routes and they will be catch here!
  kabam.app.configure('development', function () {
    kabam.app.use(express.errorHandler());
  });

  // log all errors ignoring http codes
  kabam.app.use(function(err, req, res, next){
    // if error is not an http code
    if(typeof err !== 'number'){
      httpLogger.error(err, {
        startTime: req._startTime,
        duration: (new Date() - req._startTime),
        method: req.method,
        ip: req.ip,
        uri: req.originalUrl,
        userId: (req.user && req.user._id.toString()),
        error: err,
        stack: err.stack
      });
    }
    next(err);
  });

  //TODO: handle non 500 errors
  kabam.app.configure('staging', function () {
    kabam.app.use(function (err, request, response, next) {
      if(typeof err === 'number'){
        return next(err);
      }
      response.status(500);
      response.header('Retry-After', 360);
      response.json(err);
    });
  });

  kabam.app.configure('production', function () {
    kabam.app.use(function (err, request, response, next) {
      if(typeof err === 'number'){
        return next(err);
      }
      response.status(500);
      response.header('Retry-After', 360);
      response.send('Error 500. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
  });


  //middleware setup finished. adding routes
  //doing setAppRoutes
  extendRoutesFunctions.map(function (func) {
    func(kabam);
  });


  //display all expressjs routes present for this application
  //http://expressjs.com/api.html#app.routes
  kabam.app.get('/api/routes', function (request, response) {
    response.json(kabam.app.routes);
  });

  //catch all verb to show 404 error to wrong routes
  kabam.app.get('*', function (request, response) {
    if (catchAllFunction) {
      catchAllFunction(kabam)(request, response);
    } else {
      response.send(404);
    }
  });

  return kabam.app;
};
