'use strict';

var
  FacebookStrategy = require('passport-facebook').Strategy,
  linkOAuthProfile = require('./helpers').linkOAuthProfile;


exports.name = 'kabam-core-strategies-facebook';

exports.strategy = function (core) {
  // TODO: move to config section
  if (!core.config.PASSPORT || !core.config.PASSPORT.FACEBOOK_APP_ID || !core.config.PASSPORT.FACEBOOK_APP_SECRET) {
    return;
  }
  return new FacebookStrategy({
    clientID: core.config.PASSPORT.FACEBOOK_APP_ID,
    clientSecret: core.config.PASSPORT.FACEBOOK_APP_SECRET,
    callbackURL: core.config.HOST_URL + 'auth/facebook/callback',
    passReqToCallback: true,
    stateless: true
  }, function (request, accessToken, refreshToken, profile, done) {
    linkOAuthProfile(core, 'facebook', request, profile, done);
  });
};

exports.routes = function (core) {
  // TODO: move to config section
  if (!core.config.PASSPORT || !core.config.PASSPORT.FACEBOOK_APP_ID || !core.config.PASSPORT.FACEBOOK_APP_SECRET) {
    return;
  }
  core.app.get('/auth/facebook', core.passport.authenticate('facebook'));
  core.app.get('/auth/facebook/callback', core.passport.authenticate('facebook', { successRedirect: '/auth/success', failureRedirect: '/auth/failure' }));
};




