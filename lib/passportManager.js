var async = require('async'),
  hat = require('hat'),
  rack = hat.rack(),
  LocalStrategy = require('passport-local').Strategy,
  HashStrategy = require('passport-hash').Strategy,
  GoogleStrategy = require('passport-google').Strategy;


var passportManager={
  'strategies':[],
  'routes':[],
  'initialized':false
};

passportManager.useStrategy = function(strategy){
  if(this.initialized) throw new Error('passportManager is already initialized!');
  this.strategies.push(strategy.strategy);
  this.routes.push(strategy.routes);
};

passportManager.doInitializePassportStrategies = function(passport,core){
  this.initialized=true;
//using default strategies

  //used for username/email and password
  passport.use(new LocalStrategy(
    function (username, password, done) {
      core.model.Users.findOneByLoginOrEmail(username, function (err, user) {
        if (err) {
          return done(err, false);
        } else {
          if (user) {
            if (user.verifyPassword(password)) {
              return done(null, user);
            } else {
              return done(null, false);
            }
          } else {
            return done(null, false);
          }
        }
      });
    })
  );

  //used for verify account by email
  passport.use(new HashStrategy(function (hash, done) {
    core.model.Users.findOneByApiKeyAndVerify(hash, function (err, userFound) {
      done(err, userFound);
    });
  }));

  //use google strategie by default, because it do not requires tunning!

  passport.use(new GoogleStrategy({
      returnURL: core.config.hostUrl + 'auth/google/return',
      realm: core.config.hostUrl
    },
    function (identifier, profile, done) {
      console.log('==============');
      console.log(profile);
      console.log('==============');
      var email = profile.emails[0].value;
      if (email) {
        core.model.Users.processOAuthProfile(email, done);
      } else {
        return done(new Error('There is something strange instead of user profile'));
      }
    }
  ));

  //initializing the pluggable strategies
  this.strategies.map(function(strategy){
    passport.use(strategy(core));
  });

  //Storing user in session, storage key is username
  passport.serializeUser(function (user, done) {
    done(null, user.username);
  });

  //retrieving user from session
  passport.deserializeUser(function (username, done) {
    core.model.Users.findOne({username: username}, function (err, user) {
      done(err, user);
    });
  });
};

passportManager.doInitializePassportRoutes = function (passport, core) {
  this.initialized=true;
  //registration by username, password and email
  //todo - implement the https://npmjs.org/packages/captcha
  core.app.post('/auth/signup', function (request, response) {
    request.model.Users.signUp(request.body.username, request.body.email, request.body.password,
      function (err, userCreated) {
        if (err) {
          request.flash('error', err.message);
        } else {
          userCreated.notify({'type': 'email', 'subject': "Account confirmation", 'template': 'signin'});
          request.flash('info', 'You have been registered! Please, check your email for instructions!');
        }
        response.redirect('/');
      }
    );
  });

  //verify that login/email is not busy! - to be called by ajax
  core.app.get('/auth/isBusy', function (request, response) {
    async.parallel({
      'username_ok': function (cb) {
        var username = request.query.username;
        if (username) {
          if (/^[a-zA-Z0-9_]{3,32}$/.test(username)) { //username looks OK
            request.model.Users.findOne({'username': username}, function (err, userFound) {
              cb(err, (userFound ? true : false));
            });
          } else {
            cb(null, false);//username looks bad
          }
        } else {
          cb(null, false);//username is empty
        }
      },
      'email_ok': function (cb) {
        var email = request.query.email;
        if (email) {
          // https://github.com/chriso/node-validator/blob/master/lib/validators.js#L27
          if (/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/.test(email)) { //email looks OK
            request.model.Users.findOne({'email': email}, function (err, userFound) {
              cb(err, userFound ? true : false);
            });
          } else {
            cb(null, false);//email looks bad
          }
        } else {
          cb(null, false);//email is empty
        }
      }
    }, function (err, results) {
      if (err) {
        throw err;
      }
      response.json(results)
    });
  });

  //route to complete profile
  core.app.post('/auth/completeProfile', function (request, response) {
    if (request.user) {
      request.user.completeProfile(request.body.username, request.body.password, function (err) {
        if (err) {
          request.flash('error', err.message);
        } else {
          request.flash('success', 'Thanks! Your profile is completed!')
        }
        response.redirect('back');
      });
    } else {
      response.send(403);
    }
  });

  core.app.post('/auth/resetPassword', function (request, response) {
    if (request.body.apiKey && request.body.password) {
      request.model.Users.findOneByApiKeyAndResetPassword(request.body.apiKey, request.body.password, function (err) {
        if (err) {
          request.flash('error', err.message);
        } else {
          request.flash('success', 'Thanks! Your password is reset!')
        }
        response.redirect('/');
      });
    } else {
      response.send(400, 'Wrong request! apiKey and password are missed!');
    }

  });

  //google works alwayes, it do not need tunning
  core.app.get('/auth/google', passport.authenticate('google'));
  core.app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' }));

  //autorization by password and username
  core.app.post('/auth/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/', failureFlash: true}));

  //initializing pluggable routes
  this.routes.map(function(strategyRoute){
    strategyRoute(passport,core);
  });

  //acount confirmation by link in email
  core.app.get('/auth/confirm/:hash',
    passport.authenticate('hash', { failureRedirect: '/' }),
    function (req, res) {
      res.redirect('/');
    });

  //because if it were get we can irritate users by <img src="http://example.org/auth/logout" title="" alt=""/> on our site)
  core.app.post('/auth/logout', function (request, response) {
    request.logout();
    response.send(200, 'OK');
  });
}

module.exports = exports = passportManager;