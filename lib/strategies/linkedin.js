var
  LinkedInStrategy = require('passport-linkedin-oauth2').Strategy,
  linkOAuthProfile = require('./helpers').linkOAuthProfile;


exports.strategy = function (core) {
  return new LinkedInStrategy({
    clientID: core.config.PASSPORT.LINKEDIN_API_KEY,
    clientSecret: core.config.PASSPORT.LINKEDIN_SECRET_KEY,
    scope: ['r_basicprofile', 'r_emailaddress'],
    callbackURL: core.config.HOST_URL + 'auth/linkedin/callback',
    passReqToCallback: true,
    stateless: true
  }, function (request, accessToken, refreshToken, profile, done) {
    linkOAuthProfile(core, 'linkedin', request, profile, done);
  });
};

exports.routes = function (passport, core) {
  core.app.get('/auth/linkedin', passport.authenticate('linkedin', {state: 'SOME_STATE'}));
  core.app.get('/auth/linkedin/callback', passport.authenticate('linkedin', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));
};
