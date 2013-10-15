'use strict';
var HashStrategy = require('passport-hash').Strategy;

exports.name = 'kabam-core-strategies-hash';

//used for verify account by email
exports.strategy = function (core) {
  return new HashStrategy(function (hash, done) {
    core.model.User.findOneByApiKeyAndVerify(hash, function (err, userFound) {
      done(err, userFound);
    });
  });
};
exports.routes = function (core) {
  //account confirmation by link in email
  core.app.get('/auth/confirm/:hash', core.passport.authenticate('hash', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));
};