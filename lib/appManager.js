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


module.exports = exports = function (kabam, _extendAppFunctions, _additionalStrategies, _extendMiddlewareFunctions, _extendRoutesFunctions, _catchAllFunction) {
  // setting toobusy's maxLag from config
  if (kabam.config.toobusy && kabam.config.toobusy.ENABLED && kabam.config.toobusy.MAX_LAG) {
    var maxLag = parseInt(kabam.config.toobusy.MAX_LAG);
    if (typeof maxLag === 'number') {
      console.log('setting maxLag to ', maxLag);
      toobusy.maxLag(kabam.config.toobusy.MAX_LAG);
    }
  }

  var passportManager = new PassportManager();
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
  kabam.app = express();
  kabam.httpServer = http.createServer(kabam.app);
  kabam.app.locals.css = [];
  kabam.app.locals.javascripts = [];
  kabam.app.set('env', kabam.config.ENV);
  if (kabam.config.IO && kabam.config.IO.ENABLED) {
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
    kabam.io = ioServer.listen(kabam.httpServer);
    kabam.io.enable('browser client cache');
    kabam.io.enable('browser client gzip');
    kabam.io.enable('browser client etag');
    kabam.io.enable('browser client minification');
    kabam.io.set('browser client expires', (24 * 60 * 60));
//*/
//for heroku or Pound reverse proxy
    kabam.io.set('transports', ['xhr-polling']);
    kabam.io.set('polling duration', 6);
//*/
    //verbosity level - default is 3
    kabam.io.set('log level', (kabam.config.IO.LOGLEVEL || 3));
    kabam.app.locals.javascripts.push({'url': '/socket.io/socket.io.js'});

    kabam.io.set('store', new ioRedisStore({
      redis: ioRedis,
      redisPub: kabam.createRedisClient(), //it works in pub mode, it cannot access database
      redisSub: kabam.createRedisClient(), //it works in sub mode, it cannot access database
      redisClient: kabam.redisClient
    }));
//*/
    var sessionStorage = new RedisStore({prefix: 'kabam_sess_', client: kabam.redisClient});
    kabam.io.set("authorization", passportSocketIo.authorize({
        cookieParser: express.cookieParser,
        secret: kabam.config.SECRET,
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
            kabam.model.Users.findOneByApiKey(session.passport.user, function (err, user) {
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
    kabam.on('broadcast', function (message) {
      kabam.io.sockets.emit('broadcast', message);
    });

    kabam.on('notify:sio', function (message) {
      var activeUsers = kabam.io.sockets.manager.handshaken,
        x;
      for (x in activeUsers) {
        if (activeUsers[x].user && activeUsers[x].user.username === message.user.username) {
// console.log('We can send notify to active user of '+message.user.username);
// console.log(io.sockets.manager.sockets.sockets[x]);
          if (kabam.io.sockets.manager.sockets.sockets[x]) {
            kabam.io.sockets.manager.sockets.sockets[x].emit('notify', {'user': message.user, 'message': message.message});
          }
        }
      }
    });
  }

  //setting up the views directory
  if (kabam.config.views) {
    var views = fs.readdirSync(kabam.config.views);
    if (views && views.length > 0) {
      kabam.app.set('views', kabam.config.views);
    } else {
      throw new Error('Kabam-Kernel. Unable to locate views directory at path ' + kabam.config.views);
    }
  }


  //too busy middleware which blocks requests when we're too busy
  if (kabam.config.toobusy && kabam.config.toobusy.ENABLED) {
    kabam.app.use(function (req, res, next) {
      if (toobusy()) {
        res.send(503, 'I am busy right now, sorry.');
      } else {
        next();
      }
    });
  }

  kabam.app.use(rateLimiter(kabam.redisClient, ((kabam.config.RATE_LIMIT) ? (kabam.config.RATE_LIMIT) : 400)));//400 requests per minute for every IP
  //start configuring middlewares
  kabam.app.enable('trust proxy');

  //setting up the public directory to serve static files - css, client side javascript, robots.txt
  if (kabam.config.public) {
    var publicFiles = fs.readdirSync(kabam.config.public);
    if (publicFiles && publicFiles.length > 0) {
      kabam.app.use(express.static(kabam.config.public));
    } else {
      throw new Error('Kabam-Kernel. Unable to locate views directory at path ' + kabam.config.public);
    }
  }

  kabam.app.configure('development', function () {
    console.log('Development environment!');
    kabam.app.use(express.responseTime());
    kabam.app.use(express.logger('dev'));
    kabam.app.locals.development = true;
  });

  kabam.app.configure('staging', function () {
    console.log('Staging environment!');
    kabam.app.locals.staging = true;
    kabam.app.use(express.responseTime());
    kabam.app.enable('view cache');
    kabam.app.use(express.logger('dev'));
  });

  kabam.app.configure('production', function () {
    console.log('Production environment!');
    kabam.app.locals.production = true;
    kabam.app.enable('view cache');
    kabam.app.use(express.logger('short'));
  });

  //emit events for http requests
  kabam.app.use(function (request, response, next) {
    response.on('finish', function () {
      kabam.emit('http', {
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
      kabam.app.configure(func.environment, function () {
        func.settingsFunction(kabam);
      });
    } else {
      if (func && func.settingsFunction) {
        func.settingsFunction(kabam);
      }
    }
  });

  kabam.app.use(express.compress());
  kabam.app.use(express.favicon());
  kabam.app.use(express.bodyParser());
  kabam.app.use(express.methodOverride());
  kabam.app.use(express.cookieParser(kabam.config.SECRET));
  kabam.app.use(express.session({
    secret: kabam.config.SECRET,
    store: new RedisStore({ prefix: 'kabam_sess_', client: kabam.redisClient }),
    expireAfterSeconds: 180,
    httpOnly: true
  }));

  //injecting CSRF protection - for recent csrf middleware. because it warns
  // console.warn('req.session._csrf is deprecated, use req.csrfToken([callback]) instead');
  if (!kabam.config.DISABLE_CSRF) {
    kabam.app.use(express.csrf());
    kabam.app.use(function (request, response, next) {
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

  kabam.app.use(flashMiddleware());
  kabam.app.use(passport.initialize());
  kabam.app.use(passport.session());

  //injecting default internals via middleware
  kabam.app.use(function (request, response, next) {
    response.locals.flash = request.flash();
    kabam.app.locals.hostUrl = kabam.config.HOST_URL;
    request.model = kabam.model;
    request.redisClient = kabam.redisClient;
    kabam.injectEmit(request);
    next();
  });

  //auth by kabamkey
  kabam.app.use(function (request, response, next) {
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
      request.model.Users.findOneByApiKey(kabamkey, function (err, userFound) {
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
  kabam.app.use(function (request, response, next) {
    if (request.user) {
      response.locals.myself = request.user; //inject user's model values to template
    }
    next();
  });

  //set the user as online

  kabam.app.use(function (request, response, next) {
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
      kabam.app.configure(middleware.environment, function () {
        kabam.app.use(middleware.path, middleware.SettingsFunction(kabam));
      });
    } else {
      kabam.app.use(middleware.path, middleware.SettingsFunction(kabam));
    }
  });

  //setting redirectTo url for authorization
  kabam.app.use(function (request, response, next) {
    // we cannot make redirects back to /auth/* path
    if (/^\/auth/.test(request.originalUrl)) {
      return next();
    }
    request.session.redirectTo = request.originalUrl;
    next();
  });

  //initialize router middleware!!!
  kabam.app.use(kabam.app.router);
  //initialize router middleware!!!

  //setting error handler middlewares, after ROUTER middleware,
  // so we can simply throw errors in routes and they will be catch here!
  kabam.app.configure('development', function () {
    kabam.app.use(express.errorHandler());
  });

  kabam.app.configure('staging', function () {
    kabam.app.use(function (err, request, response, next) {
      kabam.emit('error', {
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

  kabam.app.configure('production', function () {
    kabam.app.use(function (err, request, response, next) {
      kabam.emit('error', {
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
