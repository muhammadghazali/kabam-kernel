'use strict';
var
  TwitterStrategy = require('passport-twitter').Strategy,
  linkOAuthProfile = require('./helpers').linkOAuthProfile;

exports.strategy = function (core) {
  return new TwitterStrategy({
    consumerKey: core.config.PASSPORT.TWITTER_CONSUMER_KEY,
    consumerSecret: core.config.PASSPORT.TWITTER_CONSUMER_SECRET,
    callbackURL: core.config.HOST_URL + 'auth/twitter/callback',
    passReqToCallback: true,
    stateless: true
  }, function (request, token, tokenSecret, profile, done) {
    linkOAuthProfile(core, 'twitter', request, profile, done);
  });
};

exports.routes = function (passport, core) {
  core.app.get('/auth/twitter', passport.authenticate('twitter'));
  core.app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/auth/success', failureRedirect: '/auth/failure' }));
};
