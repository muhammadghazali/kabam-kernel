/** @module appManager */
'use strict';
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
  flashMiddleware = require('connect-flash'),

  fs = require('fs'),
  ioServer = require('socket.io'),
  ioRedis = require('redis'),
  http = require('http'),
  passportSocketIo = require('passport.socketio'),
  ioRedisStore = require('socket.io/lib/stores/redis');

// set shutdown procedure
process.on('SIGINT', function () {
  console.log('MWC IS GOING TO SHUT DOWN....');
  // calling .shutdown allows your process to exit normally
  toobusy.shutdown();
  process.exit();
});


module.exports = exports = function (mwc, _extendAppFunctions, _additionalStrategies, _extendMiddlewareFunctions, _extendRoutesFunctions, _catchAllFunction) {
  var passportManager = new PassportManager();
  //setting alwayes working strategies

  passportManager.useStrategy(require('./strategies/local.js'));
  passportManager.useStrategy(require('./strategies/google.js'));
  passportManager.useStrategy(require('./strategies/hash.js'));

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
  mwc.httpServer = http.createServer(mwc.app);
  mwc.app.locals.css = [];
  mwc.app.locals.javascripts = [];
  if (mwc.config.io) {
    /**
     * @ngdoc function
     * @name kabamKernel.io
     * @description
     * Socket.io main object, binded to http server of kabamKernel.app.
     * This is fully working socket.io object, that supports all socket.io functions and events.
     * Further reading - [https://github.com/LearnBoost/socket.io/wiki/Exposed-events](https://github.com/LearnBoost/socket.io/wiki/Exposed-events)
     *
     * Also the socket.io adds few listeners to kabamKernel object, so we can do this things
     * Broadcast to all users online
     * ```javascript
     *
     *     kabam.emit('broadcast',{'time': new Date().toLocaleTimeString()});
     *
     * ```
     *
     * Notify one of users, if he/she is online with simple text message (or JSON object)
     *
     * ```javascript
     *
     *  kabamKernel.model.User.findOne({'username':'john'},function(err,userFound){
     *    userFound.notify('sio','Hello, '+userFound.username+'!');
     *  });
     *
     * ```
     * Socket.io runs from the box on heroku, nodejitsu, and from behing of nginx and Pound reverse proxies
     * [https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku](https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku)
     *
     * We can enable socket.io support in application by edint field of `io` on config object like here
     * ```javascript
     *  'io':{ 'loglevel':1 };
     * ```
     * Loglevel is like this 9 - very verbose, 8 - less verbose, 7,6,5,4,3,2, 1 - not verbose
     */
    mwc.io = ioServer.listen(mwc.httpServer);
    mwc.io.enable('browser client cache');
    mwc.io.enable('browser client gzip');
    mwc.io.enable('browser client etag');
    mwc.io.enable('browser client minification');
    mwc.io.set('browser client expires', (24 * 60 * 60));
//*/
//for heroku or Pound reverse proxy
    mwc.io.set('transports', ['xhr-polling']);
    mwc.io.set('polling duration', 6);
//*/
    //verbosity level - default is 3
    mwc.io.set('log level', (mwc.config.io.loglevel || 3));
    mwc.app.locals.javascripts.push({'url': '/socket.io/socket.io.js'});

    mwc.io.set('store', new ioRedisStore({
      redis: ioRedis,
      redisPub: mwc.createRedisClient(), //it works in pub mode, it cannot access database
      redisSub: mwc.createRedisClient(), //it works in sub mode, it cannot access database
      redisClient: mwc.redisClient
    }));
//*/
    var sessionStorage = new RedisStore({prefix: 'mwc_sess_', client: mwc.redisClient});
    mwc.io.set("authorization", passportSocketIo.authorize({
        cookieParser: express.cookieParser,
        secret: mwc.config.secret,
        store: sessionStorage,
        fail: function (data, accept) { //there is no passportJS user present for this session!
// console.log('vvv fail');
// console.log(data);
// console.log('^^^ fail');
          data.user = null;
          accept(null, true);
        },
        success: function (data, accept) { //the passportJS user is present for this session!
// console.log('vvv success');
// console.log(data);
// console.log('^^^ success');

          sessionStorage.get(data.sessionID, function (err, session) {
// console.log('v session');
// console.log(session);
// console.log('^ session');
            mwc.model.Users.findOneByApiKey(session.passport.user, function (err, user) {
              if (user) {
// console.log('user found '+user.username);
                data.user = user;
                accept(err, true);
              } else {
                accept(err, false); //we break the session, because someone tryes to tamper it)
              }
            });
          });
        }
      }
    ));

    //socket.io settings

    //emit event to all (authorized and anonimus) users online
    mwc.on('broadcast', function (message) {
      mwc.io.sockets.emit('broadcast', message);
    });

    mwc.on('notify:sio', function (message) {
      var activeUsers = mwc.io.sockets.manager.handshaken,
        x;
      for (x in activeUsers) {
        if (activeUsers[x].user.username === message.user.username) {
// console.log('We can send notify to active user of '+message.user.username);
// console.log(io.sockets.manager.sockets.sockets[x]);
          if (mwc.io.sockets.manager.sockets.sockets[x]) {
            mwc.io.sockets.manager.sockets.sockets[x].emit('notify', {'user': message.user, 'message': message.message});
          }
        }
      }
    });
  }

  mwc.app.set('port', process.env.PORT || 3000);

  //setting up the views directory
  if (mwc.config.views) {
    var views = fs.readdirSync(mwc.config.views);
    if (views && views.length > 0) {
      mwc.app.set('views', mwc.config.views);
    } else {
      throw new Error('Kabam-Kernel. Unable to locate views directory at path ' + mwc.config.views);
    }
  }


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

  //setting up the public directory to serve static files - css, client side javascript, robots.txt
  if (mwc.config.public) {
    var publicFiles = fs.readdirSync(mwc.config.public);
    if (publicFiles && publicFiles.length > 0) {
      mwc.app.use(express.static(mwc.config.public));
    } else {
      throw new Error('Kabam-Kernel. Unable to locate views directory at path ' + mwc.config.public);
    }
  }

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

  //injecting CSRF protection - for recent csrf middleware. because it warns
  // console.warn('req.session._csrf is deprecated, use req.csrfToken([callback]) instead');
  if (!mwc.config.disableCsrf) {
    mwc.app.use(express.csrf());
    mwc.app.use(function (request, response, next) {
      if (request.session) {
        var token = request.csrfToken();
        response.locals.csrf = token;
        response.cookie('XSRF-TOKEN', token);
        next();
      } else {
        next();
      }
    });
  }

  mwc.app.use(flashMiddleware());
  mwc.app.use(passport.initialize());
  mwc.app.use(passport.session());

  //injecting default internals via middleware
  mwc.app.use(function (request, response, next) {
    response.locals.flash = request.flash();
    mwc.app.locals.hostUrl = mwc.config.hostUrl;
    request.model = mwc.model;
    request.redisClient = mwc.redisClient;
    mwc.injectEmit(request);
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

  mwc.app.use(function (request, response, next) {
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

  //setting redirectTo url for authorization
  mwc.app.use(function (request, response, next) {
    if (request.user) {
      next();
    } else {
      if (!(/^\/auth/.test(request.originalUrl))) { //we cannot make redirects back to /auth/* path
        request.session.redirectTo = request.originalUrl;
      }
      next();
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
    mwc.app.use(function (err, request, response, next) {
      mwc.emit('error', {
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

  mwc.app.configure('production', function () {
    mwc.app.use(function (err, request, response, next) {
      mwc.emit('error', {
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
    if (_catchAllFunction) {
      _catchAllFunction(mwc)(request, response);
    } else {
      response.send(404);
    }
  });

  return mwc.app;
};
