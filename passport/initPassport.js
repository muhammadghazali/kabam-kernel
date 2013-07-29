var async = require('async'),
  hat = require('hat'),
  rack = hat.rack(),
  LocalStrategy = require('passport-local').Strategy,
  HashStrategy = require('passport-hash').Strategy,
  GoogleStrategy = require('passport-google').Strategy,
  GitHubStrategy = require('passport-github').Strategy,
  TwitterStrategy = require('passport-twitter').Strategy,
  FacebookStrategy = require('passport-facebook').Strategy,
  LinkedInStrategy = require('passport-linkedin').Strategy;


exports.doInitializePassportStrategies = function (passport, Users, config) {

  function processProfile(profile, done) {
    var email = profile.emails[0].value;
    if (email) {
      console.log('==============');
      console.log(profile);
      console.log('==============');
      Users.findOne({'email': email}, function (err, userFound) {
        if (err) {
          return done(err, false, {'message': 'Database broken...'});
        } else {
          console.log('==============');
          console.log(userFound);
          console.log('==============');
          if (err) {
            return done(err);
          } else {
            if (userFound) {
              return done(err, userFound, {message: 'Welcome, ' + userFound.username});
            } else {
              Users.signUpByEmailOnly(email, function (err1, userCreated) {
                return done(err1, userCreated, { message: 'Please, complete your account!' });
              });
            }
          }
        }
      });
    } else {
      return done(new Error('There is something strange instead of user profile'));
    }
  };

  //initializing passport strategies
  passport.use(new LocalStrategy(
    function (username, password, done) {
      Users.findOne({username: username}, function (err, user) {
        if (err) {
          return done(err, false, {'message': 'Database broken...'});
        } else {
          if (user) {
            if (user.verifyPassword(password)) {
              return done(null, user, {message: 'Welcome, ' + user.username});
            } else {
              return done(null, false, { message: 'Access denied!' });
            }
          } else {
            return done(null, false, { message: 'Access denied!' });
          }
        }
      });
    }
  ));

  //used for verify account by email
  passport.use(new HashStrategy(function(hash,done){
    Users.findOneByApiKeyAndVerify(hash,function(err,userFound){
      done(err,userFound);
    });
  }));

  passport.use(new GoogleStrategy({
      returnURL: config.hostUrl + 'auth/google/return',
      realm: config.hostUrl
    },
    function (identifier, profile, done) {
      return processProfile(profile,done);
    }
  ));

  if (config.passport && config.passport.GITHUB_CLIENT_ID && config.passport.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: config.passport.GITHUB_CLIENT_ID,
      clientSecret: config.passport.GITHUB_CLIENT_SECRET,
      callbackURL: config.hostUrl + 'auth/github/callback'
    }, function (accessToken, refreshToken, profile, done) {
      return processProfile(profile,done);
    }));
  }

  if (config.passport && config.passport.TWITTER_CONSUMER_KEY && config.passport.TWITTER_CONSUMER_SECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: config.passport.TWITTER_CONSUMER_KEY,
      consumerSecret: config.passport.TWITTER_CONSUMER_SECRET,
      callbackURL: config.hostUrl + 'auth/twitter/callback'
    }, function (token, tokenSecret, profile, done) {
      return processProfile(profile,done);
    }));
  }

  if (config.passport && config.passport.FACEBOOK_APP_ID && config.passport.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: config.passport.FACEBOOK_APP_ID,
        clientSecret: config.passport.FACEBOOK_APP_SECRET,
        callbackURL: config.hostUrl + 'auth/facebook/callback'
      },
      function(accessToken, refreshToken, profile, done) {
        return processProfile(profile,done);
      }));
  }

  if (config.passport && config.passport.LINKEDIN_API_KEY && config.passport.LINKEDIN_SECRET_KEY) {
    passport.use(new LinkedInStrategy({
        consumerKey: config.passport.LINKEDIN_API_KEY,
        consumerSecret: config.passport.LINKEDIN_SECRET_KEY,
        callbackURL: config.hostUrl + 'auth/linkedin/callback'
      },
      function (token, tokenSecret, profile, done) {
        return processProfile(profile, done);
      }
    ));
  }
  //end of initializing passport strategies

  //Storing user in session, storage key is username
  passport.serializeUser(function (user, done) {
    done(null, user.username);
  });

  passport.deserializeUser(function (username, done) {
    Users.findOne({username: username}, function (err, user) {
      done(err, user);
    });
  });
  //end of setting passport
};


exports.doInitializePassportRoutes = function (passport, app, config) {

  //registration by username, password and email
  //todo - implement the https://npmjs.org/packages/captcha
  app.post('/auth/signup', function (request, response) {
    request.MODEL.Users.signUp(request.body.username, request.body.email, request.body.password,
      function (err, userCreated) {
        if (err) {
          request.flash('error', err.message);
        } else {
          userCreated.notify({'type': 'email', 'subject': "Account confirmation", 'message': {'template': 'signin'}});
          request.flash('info', 'You have been registered! Please, check your email for instructions!');
        }
        response.redirect('/');
      }
    );
  });

  //verify that login/email is not busy! - to be called by ajax
  app.get('/auth/isBusy',function(request,response){
    async.parallel({
      'username_ok':function(cb){
        var username=request.query.username;
        if(username){
          if(/^[a-zA-Z0-9_]{3,32}$/.test(username)){ //username looks OK
            request.MODEL.Users.findOne({'username':username},function(err,userFound){
              cb(err, (userFound?true:false));
            });
          } else {
            cb(null,false);//username looks bad
          }
        } else {
          cb(null,false);//username is empty
        }
      },
      'email_ok':function(cb){
        var email=request.query.email;
        if(email){
          // https://github.com/chriso/node-validator/blob/master/lib/validators.js#L27
          if(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/.test(email)){ //email looks OK
            request.MODEL.Users.findOne({'email':email},function(err,userFound){
              cb(err, userFound?true:false);
            });
          } else {
            cb(null,false);//email looks bad
          }
        } else {
          cb(null,false);//email is empty
        }
      }
    },function(err,results){
      if(err) throw err;
      response.json(results)
    });
  });

  //route to complete profile
  app.post('/auth/completeProfile',function(request,response){
    if(request.user){
      request.user.completeProfile(request.body.username,request.body.password,function(err){
        if(err){
          request.flash('error',err.message);
        } else {
          request.flash('success','Thanks! Your profile is completed!')
        }
        response.redirect('back');
      });
    } else {
      response.send(403);
    }
  });

  app.post('/auth/resetPassword',function(request,response){
    if(request.body.apiKey && request.body.password){
      request.MODEL.Users.findOneByApiKeyAndResetPassword(request.body.apiKey, request.body.password, function(err){
        if(err){
          request.flash('error',err.message);
        } else {
          request.flash('success','Thanks! Your password is reset!')
        }
        response.redirect('/');
      });
    } else {
      response.send(400, 'Wrong request! apiKey and password are missed!');
    }

  });

  //google works alwayes, it do not need tunning
  app.get('/auth/google', passport.authenticate('google'));
  app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' }));

  //autorization by password and username
  app.post('/auth/login',passport.authenticate('local',{successRedirect: '/',failureRedirect: '/',failureFlash: true}));

  if (config.passport && config.passport.GITHUB_CLIENT_ID && config.passport.GITHUB_CLIENT_SECRET) {
    //if we have set parameters for github, enable the github passport strategy
    app.get('/auth/github', passport.authenticate('github'),
      function (req, res) {
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
      });
    app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
      function (req, res) {
        res.redirect('/');
      });
  }

  if (config.passport && config.passport.TWITTER_CONSUMER_KEY && config.passport.TWITTER_CONSUMER_SECRET) {
    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/' }));
  }

  if (config.passport && config.passport.FACEBOOK_APP_ID && config.passport.FACEBOOK_APP_SECRET) {
    app.get('/auth/facebook', passport.authenticate('facebook'));
    app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/' }));
  }

  if (config.passport && config.passport.LINKEDIN_API_KEY && config.passport.LINKEDIN_SECRET_KEY) {
    app.get('/auth/linkedin',passport.authenticate('linkedin'),function(req, res){});
    app.get('/auth/linkedin/callback',passport.authenticate('linkedin', { failureRedirect: '/' }),
      function(req, res) {
        res.redirect('/');
      });
  }

  //acount confirmation by link in email
  app.get('/confirm/:hash',
    passport.authenticate('hash', { failureRedirect: '/' }),
    function(req, res) {
      res.redirect('/');
    });


  app.post('/auth/logout', function (request, response) {
    request.logout();
    response.send(200, 'OK');
  });

}