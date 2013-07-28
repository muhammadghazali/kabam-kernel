var async = require('async'),
  hat = require('hat'),
  rack = hat.rack(),
  LocalStrategy = require('passport-local').Strategy,
  HashStrategy = require('passport-hash').Strategy,
  GoogleStrategy = require('passport-google').Strategy,
  GitHubStrategy = require('passport-github').Strategy,
  TwitterStrategy = require('passport-twitter').Strategy,
  FacebookStrategy = require('passport-facebook').Strategy;


exports.doInitializePassportStrategies = function (passport, Users, config) {
  //initializing passport strategies
  passport.use(new LocalStrategy(
    function (username, password, done) {
      Users.findOne({username: username, active: true}, function (err, user) {
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
    //todo - need to refactor user class for it...
  }));

  passport.use(new GoogleStrategy({
      returnURL: config.hostUrl + 'auth/google/return',
      realm: config.hostUrl
    },
    function (identifier, profile, done) {
      var email = profile.emails[0].value;
      console.log(profile);
      Users.findOne({'email': email, active: true}, function (err, userFound) {
        console.log(userFound);
        if (userFound) {
          done(err, userFound, {message: 'Welcome, ' + userFound.username});
        } else {
          //model.UserModel.create({email:email},function(err,userCreated){
          done(err, false, { message: 'Access denied!' });//todo - i am not sure if user can register by singing in with Google Acount
          //});
        }
      });
    }
  ));

  if (config.passport && config.passport.GITHUB_CLIENT_ID && config.passport.GITHUB_CLIENT_SECRET) {
    //if we have set parameters for github, enable the github passport strategy
    passport.use(new GitHubStrategy({
      clientID: config.passport.GITHUB_CLIENT_ID,
      clientSecret: config.passport.GITHUB_CLIENT_SECRET,
      callbackURL: config.hostUrl + 'auth/github/callback'
    }, function (accessToken, refreshToken, profile, done) {
      var email = profile.emails[0].value;
      console.log(profile);
      Users.findOne({'email': email, active: true}, function (err, userFound) {
        console.log(userFound);
        if (userFound) {
          done(err, userFound, {message: 'Welcome, ' + userFound.username});
        } else {
          //model.UserModel.create({email:email},function(err,userCreated){
          done(err, false, { message: 'Access denied!' });//todo - i am not sure if user can register by singing in with Github Account
          //});
        }
      });
    }));
  }

  if (config.passport && config.passport.TWITTER_CONSUMER_KEY && config.passport.TWITTER_CONSUMER_SECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: config.passport.TWITTER_CONSUMER_KEY,
      consumerSecret: config.passport.TWITTER_CONSUMER_SECRET,
      callbackURL: config.hostUrl + 'auth/twitter/callback'
    }, function (token, tokenSecret, profile, done) {
      var email = profile.emails[0].value;
      console.log(profile);
      Users.findOne({'email': email, active: true}, function (err, userFound) {
        console.log(userFound);
        if (userFound) {
          done(err, userFound, {message: 'Welcome, ' + userFound.username});
        } else {
          //model.UserModel.create({email:email},function(err,userCreated){
          done(err, false, { message: 'Access denied!' });//todo - i am not sure if user can register by singing in with Twitter Account
          //});
        }
      });
    }));
  }

  if (config.passport && config.passport.FACEBOOK_APP_ID && config.passport.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: config.passport.FACEBOOK_APP_ID,
        clientSecret: config.passport.FACEBOOK_APP_SECRET,
        callbackURL: config.hostUrl + 'auth/facebook/callback'
      },
      function(accessToken, refreshToken, profile, done) {
        var email = profile.emails[0].value;
        console.log(profile);
        Users.findOne({'email': email, active: true}, function (err, userFound) {
          console.log(userFound);
          if (userFound) {
            done(err, userFound, {message: 'Welcome, ' + userFound.username});
          } else {
            //model.UserModel.create({email:email},function(err,userCreated){
            done(err, false, { message: 'Access denied!' });//todo - i am not sure if user can register by singing in with Facebook Account
            //});
          }
        });
      }));
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


}
exports.doInitializePassportRoutes = function (passport, app, config) {

  //registration by username, password and email
  //todo - implement the https://npmjs.org/packages/captcha
  app.post('/auth/signup',function(request,response){
    async.waterfall(
      [
        function (cb) {
          request.MODEL.Users.create({
            'username': request.body.username,
            'email': request.body.email,
            'apiKey': rack(),
            'confirmation':{
              'string':rack(),
              'date': new Date()
            }
          }, function (err, userCreated) {
            cb(err, userCreated);
          });
        },
        function (userCreatedReadyForSettingPassword, cb) {
          userCreatedReadyForSettingPassword.setPassword(request.params.password, function (err) {
            cb(err,userCreatedReadyForSettingPassword);
          });
        },
        function (userToNeNotified,cb){
          //to be implemented
          //userToNeNotified.notify()
          cb(null, true)
        }
      ], function (err, result) {
        if(err) throw err;
        if(result){
          request.flash('info','You have been registered! Please, check your email for instructions!');
          response.redirect('/');
        }
      });
  });

  //verify that login/email is not busy! - to be called by ajax
  app.get('/auth/isBusy',function(request,response){
    async.parallel({
      'username_ok':function(cb){
        var username=request.query.username;
        if(username){
          if(/^[a-zA-Z0-9_]{3,32}$/.test(username)){ //username looks OK
            request.MODEL.Users.findOne({'username':username},function(err,userFound){
              cb(err, userFound?true:false);
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