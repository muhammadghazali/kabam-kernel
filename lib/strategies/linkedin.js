'use strict';
var LinkedInStrategy = require('passport-linkedin').Strategy;

exports.strategy = function (core) {
  return new LinkedInStrategy({
    consumerKey: core.config.PASSPORT.LINKEDIN_API_KEY,
    consumerSecret: core.config.PASSPORT.LINKEDIN_SECRET_KEY,
    callbackURL: core.config.HOST_URL + 'auth/linkedin/callback',
    stateless: true  // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
  }, function (token, tokenSecret, profile, done) {
//    console.log('==============');
//    console.log(profile);
//    console.log('==============');
    var email = profile.emails[0].value;
    if (email) {
      core.model.Users.processOAuthProfile(email, done);
    } else {
      return done(new Error('There is something strange instead of user profile'));
    }
  });
};

exports.routes = function (passport, core) {
  core.app.get('/auth/linkedin', passport.authenticate('linkedin'), function (req, res) {
  });
  core.app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/auth/failure' }),
    function (req, res) {
      res.redirect('/auth/success');
    });
};
