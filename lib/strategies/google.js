'use strict';
var GoogleStrategy = require('passport-google').Strategy;

exports.strategy = function (core) {
  return new GoogleStrategy({
    returnURL: core.config.hostUrl + 'auth/google/return',
    realm: core.config.hostUrl,
    stateless: true  // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
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
    );
};


exports.routes = function (passport, core) {
  core.app.get('/auth/google', passport.authenticate('google'));
  core.app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/auth/failure', successRedirect: '/auth/success' }));
};
