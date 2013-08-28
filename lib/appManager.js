/** @module appManager */
var express = require('express'),
  toobusy = require('toobusy'),
  rateLimiter = require('./rateLimiter.js'),
//passport middleware
  passport = require('passport'),
  PassportManager = require('./PassportManager.js'),
//session storage
  RedisStore = require('connect-redis')(express),
//todo
//https://hacks.mozilla.org/2012/12/using-secure-client-side-sessions-to-build-simple-and-scalable-node-js-applications-a-node-js-holiday-season-part-3/
  flashMiddleware = require('connect-flash');

// set shutdown procedure
process.on('SIGINT', function () {
  console.log('MWC IS GOING TO SHUT DOWN....');
  // calling .shutdown allows your process to exit normally
  toobusy.shutdown();
  process.exit();
});


module.exports = exports = function (mwc, _extendAppFunctions, _additionalStrategies, _extendMiddlewareFunctions, _extendRoutesFunctions) {
  var passportManager = new PassportManager();
  //setting default strategies
  if (mwc.config.passport) {
    if (mwc.config.passport.FACEBOOK_APP_ID && mwc.config.passport.FACEBOOK_APP_SECRET) {
      passportManager.useStrategy(require('./strategies/facebook.js'));
    }
    if (mwc.config.passport.GITHUB_CLIENT_ID && mwc.config.passport.GITHUB_CLIENT_SECRET) {
      passportManager.useStrategy(require('./strategies/github.js'));
    }
    if (mwc.config.passport.LINKEDIN_API_KEY && mwc.config.passport.LINKEDIN_SECRET_KEY) {
      passportManager.useStrategy(require('./strategies/linkedin.js'));
    }
    if (mwc.config.passport.TWITTER_CONSUMER_KEY && mwc.config.passport.TWITTER_CONSUMER_SECRET) {
      passportManager.useStrategy(require('./strategies/twitter.js'));
    }
  }
  //applying strategies needed by mwc.extendStrategies()
  _additionalStrategies.map(passportManager.useStrategy);
  //setting passport
  passportManager.doInitializePassportStrategies(passport, mwc);

  mwc.app = express();

  mwc.app.set('port', process.env.PORT || 3000);

  //too busy middleware which blocks requests when we're too busy
  mwc.app.use(function (req, res, next) {
    if (toobusy()) {
      res.send(503, 'I am busy right now, sorry.');
    } else {
      next();
    }
  });

  mwc.app.use(rateLimiter(mwc.redisClient, ((mwc.config.rateLimit) ? (mwc.config.rateLimit) : 200)));//200 requests per minute for every IP
  //start configuring middlewares
  mwc.app.enable('trust proxy');

  mwc.app.configure('development', function () {
    console.log('Development environment!');
    mwc.app.use(express.responseTime());
    mwc.app.use(express.logger('dev'));
    mwc.app.locals.development = true;
  });

  mwc.app.configure('staging', function () {
    console.log('Staging environment!');
    mwc.app.locals.staging = true;
    mwc.app.use(express.responseTime());
    mwc.app.enable('view cache');
    mwc.app.use(express.logger('dev'));
  });

  mwc.app.configure('production', function () {
    console.log('Production environment!');
    mwc.app.locals.production = true;
    mwc.app.enable('view cache');
    mwc.app.use(express.logger('short'));
  });

  //emit events for http requests
  mwc.app.use(function (request, response, next) {
    response.on('finish', function () {
      mwc.emit('http', {
        'startTime': request._startTime,
        'duration': (new Date - request._startTime),
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

  //doing setAppParameters
  //extend vendored application settings
  _extendAppFunctions.map(function (func) {
    if (func.environment) {
      mwc.app.configure(func.environment, function () {
        func.settingsFunction(mwc);
      });
    } else {
      if (func && func.settingsFunction) {
        func.settingsFunction(mwc);
      }
    }
  });

  mwc.app.use(express.compress());
  mwc.app.use(express.favicon());
  mwc.app.use(express.bodyParser());
  mwc.app.use(express.methodOverride());
  mwc.app.use(express.cookieParser(mwc.config.secret));
  mwc.app.use(express.session({
    secret: mwc.config.secret,
    store: new RedisStore({ prefix: 'mwc_sess_', client: mwc.redisClient }),
    expireAfterSeconds: 180,
    httpOnly: true
  }));
  if(!mwc.config.disableCsrf){
    mwc.app.use(express.csrf());
  }
  mwc.app.use(flashMiddleware());
  mwc.app.use(passport.initialize());
  mwc.app.use(passport.session());

  //injecting default internals via middleware
  mwc.app.use(function (request, response, next) {
    if (request.session && request.session._csrf) {
      response.locals.csrf = request.session._csrf;
    }
    response.locals.flash = request.flash();
    mwc.app.locals.hostUrl = mwc.config.hostUrl;
    request.model = mwc.model;
    request.redisClient = mwc.redisClient;
    mwc.injectEmit(request);
    response.cookie('XSRF-TOKEN', request.session._csrf);
    next();
  });

  //auth by mwckey
  mwc.app.use(function (request, response, next) {
    var mwckey = false;
    //mwckey as GET custom field
    if (request.query && request.query.mwckey) {//GET
      mwckey = request.query.mwckey;
    }

    //mwckey as POST,PUT,DELETE custom field
    if (request.body && request.body.mwckey) {//POST,PUT,DELETE
      mwckey = request.body.mwckey;
    }
    //mwckey as custom header
    if (request.header('mwckey')) {
      mwckey = request.header('mwckey');
    }

    if (mwckey) {
      request.model.Users.findOneByApiKey(mwckey, function (err, userFound) {
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
  });

  //inject user profile values in template
  mwc.app.use(function (request, response, next) {
    if (request.user) {
      response.locals.myself = request.user; //inject user's model values to template
    }
    next();
  });

  //set the user as online

  mwc.app.use(function(request,response,next){
    if(request.user){
      if(request.user.isOnline){
        next();
      } else {
        request.user.lastSeenOnline = new Date();
        request.user.save(next);
      }
    } else {
      next();
    }
  });


  //doing setAppMiddleware
  //extend vendored application middlewares settings
  _extendMiddlewareFunctions.map(function (middleware) {
    if (middleware.environment) {
      mwc.app.configure(middleware.environment, function () {
        mwc.app.use(middleware.path, middleware.SettingsFunction(mwc));
      });
    } else {
      mwc.app.use(middleware.path, middleware.SettingsFunction(mwc));
    }
  });

  //initialize router middleware!!!
  mwc.app.use(mwc.app.router);
  //initialize router middleware!!!

  //setting error handler middlewares, after ROUTER middleware,
  // so we can simply throw errors in routes and they will be catch here!
  mwc.app.configure('development', function () {
    mwc.app.use(express.errorHandler());
  });

  mwc.app.configure('staging', function () {
    mwc.app.use(function (err, req, res, next) {
      mwc.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.json(err);
    });
  });

  mwc.app.configure('production', function () {
    mwc.app.use(function (err, req, res, next) {
      mwc.emit('error', err);
      res.status(503);
      res.header('Retry-After', 360);
      res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
  });
  //middleware setup finished. adding routes

  //doing setAppRoutes
  _extendRoutesFunctions.map(function (func) {
    func(mwc);
  });

  //set authorization routes for passport
  passportManager.doInitializePassportRoutes(passport, mwc);

  //display all expressjs routes present for this application
  //http://expressjs.com/api.html#app.routes
  mwc.app.get('/api/routes', function (request, response) {
    response.json(mwc.app.routes);
  });
  //catch all verb to show 404 error to wrong routes
  mwc.app.get('*', function (request, response) {
    response.send(404);
  });

  return mwc.app;
};
