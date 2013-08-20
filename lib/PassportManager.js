var async = require('async'),
  LocalStrategy = require('passport-local').Strategy,
  HashStrategy = require('passport-hash').Strategy,
  GoogleStrategy = require('passport-google').Strategy;


function PassportManager(){
  var strategies=[],
   routes=[],
   initialized = false;

  this.useStrategy = function(strategy){
    if(initialized) throw new Error('passportManager is already initialized!');
    strategies.push(strategy.strategy);
    routes.push(strategy.routes);
  };

  this.doInitializePassportStrategies = function(passport,core){
    initialized=true;
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
                user.invalidateSession(function(err,newApiKey){
                  if(err){
                    done(err,false);
                  } else {
                    user.apiKey=newApiKey;
                    done(null, user);
                  }
                });
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
    strategies.map(function(strategy){
      passport.use(strategy(core));
    });

    //Storing user in session, storage key is username
    passport.serializeUser(function (user, done) {
      done(null, user.apiKey);
    });

    //retrieving user from session
    passport.deserializeUser(function (apiKey, done) {
      core.model.Users.findOne({apiKey: apiKey}, function (err, user) {
        done(err, user);
      });
    });
  };

  this.doInitializePassportRoutes = function (passport, core) {
    initialized=true;
    //registration by username, password and email
    //todo - implement the https://npmjs.org/packages/captcha
    core.app.post('/auth/signup', function (request, response) {
      request.model.Users.signUp(request.body.username, request.body.email, request.body.password,
        function (err, userCreated) {
          if(request.is('json')){
            if (err) {
              response.json(400,{
                errors: {form: err.message}
              });
            } else {
              userCreated.notify('email',{'subject': "Account confirmation", 'template': 'signin'});
              response.json(201,{
                'username':userCreated.username,
                'email':userCreated.email
              });
            }
          } else {
            if (err) {
              request.flash('error', err.message);
            } else {
              userCreated.notify('email',{'subject': "Account confirmation", 'template': 'signin'});
              request.flash('info', 'You have been registered! Please, check your email for instructions!');
            }
            response.redirect('/');
          }
        }
      );
    });

    //verify that login/email is not busy! - to be called by ajax
    core.app.post('/auth/isBusy', function (request, response) {
      async.parallel({
        'username': function (cb) {
          var username = request.body.username;
          if (username) {
            if (/^[a-zA-Z0-9_]{3,32}$/.test(username)) { //username looks OK
              request.model.Users.findOne({'username': username}, function (err, userFound) {
                cb(err, (userFound ?  'USERNAME_BUSY' : 'OK'));
              });
            } else {
              cb(null, 'BAD_USERNAME');//username looks bad
            }
          } else {
            cb(null, 'EMPTY_USERNAME');//username is empty
          }
        },
        'email': function (cb) {
          var email = request.body.email;
          if (email) {
            // https://github.com/chriso/node-validator/blob/master/lib/validators.js#L27
            if (/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/.test(email)) { //email looks OK
              request.model.Users.findOne({'email': email}, function (err, userFound) {
                cb(err, (userFound ? 'EMAIL_BUSY' : 'OK'));
              });
            } else {
              cb(null, 'BAD_EMAIL');//email looks bad
            }
          } else {
            cb(null, 'EMPTY_EMAIL');//email is empty
          }
        }
      }, function (err, results) {
        if (err) {
          throw err;
        }
        setTimeout(function(){
          response.json(results);
        }, Math.floor(Math.random()*1000));
      });
    });

    //route to complete profile
    core.app.post('/auth/completeProfile', function (request, response) {
      if (request.user) {
        request.user.completeProfile(request.body.username, request.body.password, function (err) {
          if (err) {
            request.flash('error', err.message);
          } else {
            request.flash('success', 'Thanks! Your profile is completed!');
          }
          response.redirect('back');
        });
      } else {
        response.send(403);
      }
    });

    //route to ask for password reset email
    core.app.post('/auth/restoreAccount',function(request,response){
      if (request.body.email) {
        request.model.Users.findOneByLoginOrEmail(request.body.email,function(err,userFound){
          if(err) throw err;
          if(userFound){
            userFound.invalidateSession(function(err){
              if(err) throw err;
              userFound.notify('email',{'template':'restore'});
            });
          }
          request.flash('success', 'Check your email address, we send you instructions for restoring account');
          response.redirect('back');
        });
      } else {
        response.send(400);
      }
    });
    //route to reset password
    core.app.post('/auth/resetPassword', function (request, response) {
      if (request.body.apiKey && request.body.password) {
        request.model.Users.findOneByApiKeyAndResetPassword(request.body.apiKey, request.body.password, function (err) {
          if (err) {
            request.flash('error', err.message);
          } else {
            request.flash('success', 'Thanks! Your password is reset!');
          }
          response.redirect('/');
        });
      } else {
        response.send(400, 'Wrong request! apiKey and password are missed!');
      }
    });

    //google works always, it do not need tuning
    core.app.get('/auth/google', passport.authenticate('google'));
    core.app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' }));

    //autorization by password and username
    core.app.post('/auth/login',function(request,response,next){
      passport.authenticate('local',function(err,user,info){
        if (err) next(err);
        if(user){
          if(request.is('json')){
            response.json(202,{
              'username':user.username,
              'email':user.email
            });
          } else {
            request.flash('info', 'Welcome, ' + user.username+'!');
            response.redirect('/');
          }
        } else {
          if(request.is('json')){
            response.status(400);
            response.json({errors: {form: 'Incorrect username or password'}});
          } else {
            request.flash('error', 'Incorrect username or password');
            response.redirect('/');
          }
        }
      })(request,response,next);
    });

    //initializing pluggable routes
    routes.map(function(strategyRoute){
      strategyRoute(passport,core);
    });

    //account confirmation by link in email
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
};






module.exports = exports = PassportManager;
