'use strict';

var
  express = require('express'),
  ioServer = require('socket.io'),
  ioRedis = require('redis'),
  passportSocketIo = require('passport.socketio'),
  ioRedisStore = require('socket.io/lib/stores/redis'),
  RedisStore = require('connect-redis')(express);

exports.name = 'kabam-core-socket-io';
exports.core = function(kernel){
  kernel.OLOLO = 42;
};
exports.app = function(kernel){
  if (!kernel.config.IO || !kernel.config.IO.ENABLED) {
    return;
  }
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
  kernel.io = ioServer.listen(kernel.httpServer);
  kernel.io.enable('browser client cache');
  kernel.io.enable('browser client gzip');
  kernel.io.enable('browser client etag');
  kernel.io.enable('browser client minification');
  kernel.io.set('browser client expires', (24 * 60 * 60));
////for heroku or Pound reverse proxy
//  kernel.io.set('transports', ['xhr-polling']);
  kernel.io.set('polling duration', 6);
  //verbosity level - default is 3
  kernel.io.set('log level', (kernel.config.IO.LOGLEVEL || 3));
  kernel.app.locals.javascripts.push({'url': '/socket.io/socket.io.js'});

  kernel.io.set('store', new ioRedisStore({
    redis: ioRedis,
    redisPub: kernel.createRedisClient(), //it works in pub mode, it cannot access database
    redisSub: kernel.createRedisClient(), //it works in sub mode, it cannot access database
    redisClient: kernel.redisClient
  }));
  var sessionStorage = new RedisStore({prefix: 'kabam_sess_', client: kernel.redisClient});
  kernel.io.set('authorization', passportSocketIo.authorize({
      cookieParser: express.cookieParser,
      secret: kernel.config.SECRET,
      store: sessionStorage,
      // there is no passportJS user present for this session!
      fail: function (data, accept) {
        data.user = null;
        accept(null, true);
      },
      // the passportJS user is present for this session!
      success: function (data, accept) {

        sessionStorage.get(data.sessionID, function (err, session) {
          kernel.model.User.findOneByApiKey(session.passport.user, function (err, user) {
            if (user) {
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
  kernel.on('broadcast', function (message) {
    kernel.io.sockets.emit('broadcast', message);
  });

  kernel.on('notify:sio', function (message) {
    var activeUsers = kernel.io.sockets.manager.handshaken,
      x;
    for (x in activeUsers) {
      if (activeUsers[x].user && message.user && activeUsers[x].user.username === message.user.username) {
        if (kernel.io.sockets.manager.sockets.sockets[x]) {
          kernel.io.sockets.manager.sockets.sockets[x].emit('notify', {
            'user': message.user,
            'message': message.message,
            'type': message.type
          });
        }
      }
    }
  });

  // socket.io event handlers
  kernel.io.sockets.on('connection', function (socket) {

    // receive message from frontend
    socket.on('backend', function(data) {
      if (data.action === 'notify:sio') {
        // relay notify:sio message from client
        kernel.emit('notify:sio', data);
      } else if (data.action === 'subscribe' && data.channel) {
        // subscribe client
        socket.join(data.channel);
      } else if (data.action === 'unsubscribe' && data.channel) {
        // unsubscribe client
        socket.leave(data.channel);
      } else if (data.action === 'publish' && data.channel) {
        // publish an event
        socket.broadcast.to(data.channel).emit(data.event, data);
      }
    });

  });

  // publish to room for model changes
  kernel.on('update', function(data) {
    if (!data.channel || !/\w+:\w+/.test(data.channel)) {
      return;
    }

    // single object room
    if (kernel.io.sockets.manager.rooms['/' + data.channel]) {
      kernel.io.sockets.in(data.channel).emit('update', data);
    }

    // list room
    var arr = /(\w+):/.exec(data.channel);
    if (arr && kernel.io.sockets.manager.rooms['/' + arr[1]]) {
      data.channel = arr[1];
      kernel.io.sockets.in(arr[1]).emit('update', data);
    }
  });

  kernel.on('delete', function(data) {
    if (!data.channel || !/\w+:\w+/.test(data.channel)) {
      return;
    }

    // single object room
    if (kernel.io.sockets.manager.rooms['/' + data.channel]) {
      kernel.io.sockets.in(data.channel).emit('delete', data);
    }

    var arr = /(\w+):/.exec(data.channel);
    if (arr && kernel.io.sockets.manager.rooms['/' + arr[1]]) {
      data.channel = arr[1];
      kernel.io.sockets.in(arr[1]).emit('delete', data);
    }
  });

  kernel.on('create', function(data) {
    if (!data.channel) {
      return;
    }

    if (kernel.io.sockets.manager.rooms['/' + data.channel]) {
      kernel.io.sockets.in(data.channel).emit('create', data);
    }

  });

};
