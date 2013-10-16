'use strict';

var
  GitHubStrategy = require('passport-github').Strategy,
  linkOAuthProfile = require('./helpers').linkOAuthProfile;


exports.name = 'kabam-core-strategies-github';

exports.strategy = function (core) {
  // TODO: move to config section
  if (!core.config.PASSPORT || !core.config.PASSPORT.GITHUB_CLIENT_ID || !core.config.PASSPORT.GITHUB_CLIENT_SECRET){
    return;
  }
  return new GitHubStrategy({
    clientID: core.config.PASSPORT.GITHUB_CLIENT_ID,
    clientSecret: core.config.PASSPORT.GITHUB_CLIENT_SECRET,
    scope:['user:email'], //http://developer.github.com/v3/oauth/#scopes
    callbackURL: core.config.HOST_URL + 'auth/github/callback',
    userAgent: core.config.HOST_URL,
    passReqToCallback: true,
    stateless: true
  }, function (request, accessToken, refreshToken, profile, done) {
    linkOAuthProfile(core, 'github', request, profile, done);
  });
};

exports.routes = function (core) {
  // TODO: move to config section
  if (!core.config.PASSPORT || !core.config.PASSPORT.GITHUB_CLIENT_ID && !core.config.PASSPORT.GITHUB_CLIENT_SECRET){
    return;
  }
  core.app.get('/auth/github', core.passport.authenticate('github'));
  core.app.get('/auth/github/callback', core.passport.authenticate('github', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));
};



