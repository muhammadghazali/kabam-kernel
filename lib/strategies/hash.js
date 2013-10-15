'use strict';
var HashStrategy = require('passport-hash').Strategy;
//used for verify account by email
exports.strategy = function (core) {
  return new HashStrategy(function (hash, done) {
    core.model.User.findOneByApiKeyAndVerify(hash, function (err, userFound) {
      done(err, userFound);
    });
  });
};

exports.routes = function (passport, core) {
  //account confirmation by link in email
  core.app.get('/auth/confirm/:hash',
    passport.authenticate('hash', { failureRedirect: '/auth/failure' }),
    function (req, res) {
      res.redirect('/auth/success');
    });
};
