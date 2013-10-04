'use strict';
var GitHubStrategy = require('passport-github').Strategy;

exports.strategy = function (core) {
  return new GitHubStrategy({
    clientID: core.config.PASSPORT.GITHUB_CLIENT_ID,
    clientSecret: core.config.PASSPORT.GITHUB_CLIENT_SECRET,
    scope:['user:email'], //http://developer.github.com/v3/oauth/#scopes
    callbackURL: core.config.HOST_URL + 'auth/github/callback',
    userAgent: core.config.HOST_URL,
    passReqToCallback: true,
    stateless: true  // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
  }, function (request, accessToken, refreshToken, profile, done) {
//    console.log('==============AUTH VIA GITHUB');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'github' && profile.id) {
      if (request.user) {
        // linking github profile
        request.user.setKeyChain('github', profile.id, function (err) {
          if (err) throw err;
          request.flash('success', 'Your github profile has been attached to your account! You can authorize via Github.com now!');
          core.model.Users.findOneByKeychain('github', profile.id, function (err, userFound) {
            done(err, userFound);
          });
        });
      } else {
        core.model.Users.findOneByKeychain('github', profile.id, function (err, userFound) {
          if (err) {
            done(err);
          } else {
            if (userFound) {
              done(null, userFound);
            } else {
              request.flash('error', 'Unable to signin via github.com! Please, register with username, email and password and than attach your github profile to it!');
              done(null, false);
            }
          }
        });
      }
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function (passport, core) {
  core.app.get('/auth/github', passport.authenticate('github'),
    function (request, response) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });


  core.app.get('/auth/github/callback', passport.authenticate('github', {  failureRedirect: '/auth/failure' }),
    function (request, response) {
      response.redirect('/auth/success');
    }
  );
};
