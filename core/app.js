'use strict';
var
  express = require('express'),
  flashMiddleware = require('connect-flash'),
  RedisStore = require('connect-redis')(express);

exports.name = 'kabam-core-app';

exports.app = function(kernel){
  kernel.app.configure('development', function () {
    console.log('Development environment!');
    kernel.app.use(express.responseTime());
    kernel.app.use(express.logger('dev'));
    kernel.app.locals.development = true;
  });

  kernel.app.configure('staging', function () {
    console.log('Staging environment!');
    kernel.app.locals.staging = true;
    kernel.app.use(express.responseTime());
    kernel.app.enable('view cache');
    kernel.app.use(express.logger('dev'));
  });

  kernel.app.configure('production', function () {
    console.log('Production environment!');
    kernel.app.locals.production = true;
    kernel.app.enable('view cache');
    kernel.app.use(express.logger('short'));
  });

  //emit events for http requests
  kernel.app.use(function (request, response, next) {
    response.on('finish', function () {
      kernel.emit('http', {
        'startTime': request._startTime,
        'duration': (new Date() - request._startTime),
        'statusCode': response.statusCode,
        'method': request.method,
        'ip': request.ip,
        'uri': request.originalUrl,
        'username': (request.user ? request.user.username : null),
        'email': (request.user ? request.user.email : null)
      });
    });
    next();
  });

  //setting error handler middlewares, after ROUTER middleware,
  // so we can simply throw errors in routes and they will be catch here!
  kernel.app.configure('development', function () {
    kernel.app.use(express.errorHandler());
  });

  kernel.app.configure('staging', function () {
    kernel.app.use(function (err, request, response, next) {
      kernel.emit('error', {
        'startTime': request._startTime,
        'duration': (new Date() - request._startTime),
        'method': request.method,
        'ip': request.ip,
        'uri': request.originalUrl,
        'username': (request.user ? request.user.username : null),
        'email': (request.user ? request.user.email : null),
        'error': err
      });
      response.status(503);
      response.header('Retry-After', 360);
      response.json(err);
    });
  });

  kernel.app.configure('production', function () {
    kernel.app.use(function (err, request, response, next) {
      kernel.emit('error', {
        'startTime': request._startTime,
        'duration': (new Date() - request._startTime),
        'method': request.method,
        'ip': request.ip,
        'uri': request.originalUrl,
        'username': (request.user ? request.user.username : null),
        'email': (request.user ? request.user.email : null),
        'error': err
      });
      response.status(503);
      response.header('Retry-After', 360);
      response.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
  });
};

exports.middleware = [
  function(kernel){return express.cookieParser(kernel.config.SECRET);},
  function(kernel){
    return express.session({
      secret: kernel.config.SECRET,
      store: new RedisStore({ prefix: 'kabam_sess_', client: kernel.redisClient }),
      expireAfterSeconds: 180,
      httpOnly: true
    });
  },
  function(){return express.compress();},
  function(){return express.favicon();},
  function(){return express.bodyParser();},
  function(){return express.methodOverride();},
  function(){return flashMiddleware();},
  function(kernel){return kernel.passport.initialize();},
  function(kernel){return kernel.passport.session();},
  function(kernel){
    if (!kernel.config.DISABLE_CSRF) {
      return express.csrf();
    }
  },
  function(kernel){
    if(!kernel.config.DISABLE_CSRF){
      return function (request, response, next) {
        if (request.session) {
          var token = request.csrfToken();
          response.locals.csrf = token;
          response.cookie('XSRF-TOKEN', token);
          next();
        } else {
          next();
        }
      };
    }
  },
  function(kernel){
    //auth by kabamkey
    return function (request, response, next) {
      var kabamkey = false;
      // kabamkey as GET custom field
      if (request.query && request.query.kabamkey) {//GET
        kabamkey = request.query.kabamkey;
      }

      // kabamkey as POST,PUT,DELETE custom field
      if (request.body && request.body.kabamkey) {//POST,PUT,DELETE
        kabamkey = request.body.kabamkey;
      }
      // kabamkey as custom header
      if (request.header('kabamkey')) {
        kabamkey = request.header('kabamkey');
      }

      if (kabamkey) {
        kernel.model.User.findOneByApiKey(kabamkey, function (err, userFound) {
          if (err) {
            throw err;
          }
          if (userFound) {
            //console.log(userFound);
            request.user = userFound;
          }
          next();
        });
      } else {
        next();
      }
    };
  },
  function(kernel){
    //injecting default internals via middleware
    return function (request, response, next) {
      response.locals.flash = request.flash();
      kernel.app.locals.hostUrl = kernel.config.HOST_URL;
      request.model = kernel.model;
      request.redisClient = kernel.redisClient;
      kernel.injectEmit(request);
      next();
    };
  },
  function(){
    //set the user as online
    return function (request, response, next) {
      if (request.user) {
        if (request.user.isOnline) {
          next();
        } else {
          request.user.lastSeenOnline = new Date();
          request.user.save(next);
        }
      } else {
        next();
      }
    };
  },
  function(){
    //setting redirectTo url for authorization
    return function (request, response, next) {
      // we cannot make redirects back to /auth/* path
      if (/^\/auth/.test(request.originalUrl)) {
        return next();
      }
      request.session.redirectTo = request.originalUrl;
      next();
    };
  }
];