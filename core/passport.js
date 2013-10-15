'use strict';
var Passport = require('passport').Passport;

exports.name = 'kabam-core-passport';
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