'use strict';
var
  os = require('os'),
  crypto = require('crypto'),
  express = require('express'),
  flashMiddleware = require('connect-flash'),
  RedisStore = require('connect-redis')(express),
  path = require('path'),
  logger = require('../lib/logging').getLogger(module);


function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}

exports.name = 'kabam-core-app';

exports.config = {
  ENV: {
    default: 'development',
    env: 'NODE_ENV'
  },

  SECRET: {
    default: function () {
      logger.warn('config.SECRET is missing! Generating the secret on the fly...');
      return md5(JSON.stringify(os));
    },
    env: 'SECRET'
  },

  PORT: {
    default: 3000,
    env: 'PORT'
  },

  HOST_URL: {
    default: function () {
      var hostname = os.hostname();
      if (this.ENV === 'development') {
        hostname = 'localhost';
      }
      return 'http://' + hostname + ':' + this.PORT + '/';
    },
    env: 'HOST_URL'
  },

  DISABLE_CSRF: {
    default: false
  },

  BASE_DIR: {
    default: function(){
      return path.dirname(process.mainModule.filename);
    }
  }
};

exports.app = function(kernel){

  var logger = kernel.logging.getLogger(module),
    httpLogger = kernel.logging.getLogger('http', module);

  kernel.app.configure('development', function () {
    logger.info('Development environment!');
    kernel.app.use(express.responseTime());
    kernel.app.use(express.logger('dev'));
    kernel.app.locals.development = true;
  });

  kernel.app.configure('staging', function () {
    logger.info('Staging environment!');
    kernel.app.locals.staging = true;
    kernel.app.use(express.responseTime());
    kernel.app.enable('view cache');
    kernel.app.use(express.logger('dev'));
  });

  kernel.app.configure('production', function () {
    logger.info('Production environment!');
    kernel.app.locals.production = true;
    kernel.app.enable('view cache');
  });

  // log http events
  kernel.app.use(function (req, res, next) {
    // TODO: options for logging bodies of req and res?
    function logRequest(){
      res.removeListener('finish', logRequest);
      res.removeListener('close', logRequest);
      httpLogger.info({
        startTime: req._startTime,
        duration: (new Date() - req._startTime),
        statusCode: req.statusCode,
        method: req.method,
        ip: req.ip,
        uri: req.originalUrl,
        userId: (req.user && req.user._id.toString())
      });
    }

    res.on('finish', logRequest);
    res.on('close', logRequest);

    next();
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
      response.locals.config = kernel.config;
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