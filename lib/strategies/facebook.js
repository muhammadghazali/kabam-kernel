var FacebookStrategy = require('passport-facebook').Strategy;

exports.strategy = function (core) {
  return new FacebookStrategy({
      clientID: core.config.passport.FACEBOOK_APP_ID,
      clientSecret: core.config.passport.FACEBOOK_APP_SECRET,
      callbackURL: core.config.hostUrl + 'auth/facebook/callback'
    },
    function (accessToken, refreshToken, profile, done) {
      console.log('==============');
      console.log(profile);
      console.log('==============');
      var email = profile.emails[0].value;
      if (email) {
        core.model.Users.processOAuthProfile(email,done);
      } else {
        return done(new Error('There is something strange instead of user profile'));
      }
    });
};

exports.routes = function(passport,core){
  core.app.get('/auth/facebook', passport.authenticate('facebook'));
  core.app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/' }));
};