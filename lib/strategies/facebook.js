'use strict';
var
  FacebookStrategy = require('passport-facebook').Strategy,
  oauthCallback = require('./oauthCallback');

exports.strategy = function (core) {
  return new FacebookStrategy({
      clientID: core.config.PASSPORT.FACEBOOK_APP_ID,
      clientSecret: core.config.PASSPORT.FACEBOOK_APP_SECRET,
      callbackURL: core.config.HOST_URL + 'auth/facebook/callback',
      passReqToCallback: true,
      stateless: true
    },
    function (request, accessToken, refreshToken, profile, done) {
      oauthCallback(core, 'facebook', request, profile, done);
    });
};

exports.routes = function (passport, core) {
  core.app.get('/auth/facebook', passport.authenticate('facebook'));
  core.app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/auth/success', failureRedirect: '/auth/failure' }));
};


