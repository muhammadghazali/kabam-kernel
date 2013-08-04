var LinkedInStrategy = require('passport-linkedin').Strategy;

exports.strategy = function (core) {
  return new LinkedInStrategy({
    consumerKey: core.config.passport.LINKEDIN_API_KEY,
    consumerSecret: core.config.passport.LINKEDIN_SECRET_KEY,
    callbackURL: core.config.hostUrl + 'auth/linkedin/callback'
  }, function (token, tokenSecret, profile, done) {
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

exports.routes = function (passport, core) {
  core.app.get('/auth/linkedin', passport.authenticate('linkedin'), function (req, res) {});
  core.app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/' }),
    function (req, res) {
      res.redirect('/');
    });
};
