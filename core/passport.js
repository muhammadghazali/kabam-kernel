'use strict';
var Passport = require('passport').Passport;

var configSchema = {};


['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'TWITTER_CONSUMER_KEY', 'TWITTER_CONSUMER_SECRET',
 'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'LINKEDIN_API_KEY', 'LINKEDIN_SECRET_KEY'
].forEach(function (variable) {
  configSchema['PASSPORT.'+variable] = {
    default: null,
    env: variable
  };
});

exports.name = 'kabam-core-passport';
exports.config = configSchema;
exports.app = function(kernel){
  var passport = new Passport();

  // this plugin depends on `kernel.strategies`
  kernel.extensions.strategies.forEach(function(factory){
    var strategy = factory(kernel);
    // jshint expr: true
    strategy && passport.use(strategy);
  });

  passport.serializeUser(function (user, done) {
    done(null, user.apiKey);
  });

  //retrieving user from session
  passport.deserializeUser(function (apiKey, done) {
    kernel.model.User.findOne({apiKey: apiKey}, function (err, user) {
      done(err, user);
    });
  });

  kernel.passport = passport;
};