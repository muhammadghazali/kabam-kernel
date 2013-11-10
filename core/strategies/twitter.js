'use strict';
var
  TwitterStrategy = require('passport-twitter').Strategy,
  linkOAuthProfile = require('./helpers').linkOAuthProfile;

exports.name = 'kabam-core-strategies-twitter';

exports.strategy =  function (core) {
  // TODO: move to config section
  if (!core.config.PASSPORT || !core.config.PASSPORT.TWITTER_CONSUMER_KEY || !core.config.PASSPORT.TWITTER_CONSUMER_SECRET){
    return;
  }
  return new TwitterStrategy({
    consumerKey: core.config.PASSPORT.TWITTER_CONSUMER_KEY,
    consumerSecret: core.config.PASSPORT.TWITTER_CONSUMER_SECRET,
    callbackURL: core.config.HOST_URL + 'auth/twitter/callback',
    passReqToCallback: true,
    stateless: true
  }, function (request, token, tokenSecret, profile, done) {
    linkOAuthProfile(core, 'twitter', request, profile, false, done);
  });
};

exports.routes = function (core) {
  // TODO: move to config section
  if (!core.config.PASSPORT || !core.config.PASSPORT.TWITTER_CONSUMER_KEY || !core.config.PASSPORT.TWITTER_CONSUMER_SECRET){
    return;
  }
  core.app.get('/auth/twitter', core.passport.authenticate('twitter'));
  core.app.get('/auth/twitter/callback', core.passport.authenticate('twitter', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));
};
