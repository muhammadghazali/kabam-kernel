var
  GitHubStrategy = require('passport-github').Strategy,
  oauthCallback = require('./oauthCallback');

exports.strategy = function (core) {
  return new GitHubStrategy({
    clientID: core.config.PASSPORT.GITHUB_CLIENT_ID,
    clientSecret: core.config.PASSPORT.GITHUB_CLIENT_SECRET,
    scope:['user:email'], //http://developer.github.com/v3/oauth/#scopes
    callbackURL: core.config.HOST_URL + 'auth/github/callback',
    userAgent: core.config.HOST_URL,
    passReqToCallback: true,
    stateless: true
  }, function (request, accessToken, refreshToken, profile, done) {
    oauthCallback(core, 'github', request, profile, done);
  });
};


exports.routes = function (passport, core) {
  core.app.get('/auth/github', passport.authenticate('github'));
  core.app.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));
};
