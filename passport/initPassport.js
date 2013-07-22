var LocalStrategy = require('passport-local').Strategy,
  HashStrategy = require('passport-hash').Strategy,
  GoogleStrategy = require('passport-google').Strategy,
  GitHubStrategy = require('passport-github').Strategy,
  TwitterStrategy = require('passport-twitter').Strategy;


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

  if(config.passport && config.passport.GITHUB_CLIENT_ID && config.passport.GITHUB_CLIENT_SECRET){
  //if we have set parameters for github, enable the github passport strategy
  passport.use(new GitHubStrategy({
      clientID: config.passport.GITHUB_CLIENT_ID,
      clientSecret: config.passport.GITHUB_CLIENT_SECRET,
      callbackURL: config.hostUrl + 'auth/github/callback'
    },function(accessToken, refreshToken, profile, done){
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
  }));
  }

  if(config.passport && config.passport.TWITTER_CONSUMER_KEY && config.passport.TWITTER_CONSUMER_SECRET){
    passport.use(new TwitterStrategy({
      consumerKey: config.passport.TWITTER_CONSUMER_KEY,
      consumerSecret: config.passport.TWITTER_CONSUMER_SECRET,
      callbackURL: config.hostUrl + 'auth/twitter/callback'
    },function(token, tokenSecret, profile, done){
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
exports.doInitializePassportRoutes = function (passport, app) {

  //google works alwayes, it do not need tunning
  app.get('/auth/google', passport.authenticate('google'));
  app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' }));




  if(config.passport && config.passport.GITHUB_CLIENT_ID && config.passport.GITHUB_CLIENT_SECRET){
    //if we have set parameters for github, enable the github passport strategy
  app.get('/auth/github',passport.authenticate('github'),
    function(req, res){
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });
  app.get('/auth/github/callback',passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
      res.redirect('/');
    });
  }

  if(config.passport && config.passport.TWITTER_CONSUMER_KEY && config.passport.TWITTER_CONSUMER_SECRET){
    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback',passport.authenticate('twitter', { successRedirect: '/',failureRedirect: '/' }));
  }

  app.post('/logoff', function (request, response) {
    request.logout();
    response.send(200, 'OK');
  });

}