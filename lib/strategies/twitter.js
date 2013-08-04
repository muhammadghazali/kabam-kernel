var TwitterStrategy = require('passport-twitter').Strategy;

exports.strategy = function (core) {
  return new TwitterStrategy({
    consumerKey: core.config.passport.TWITTER_CONSUMER_KEY,
    consumerSecret: core.config.passport.TWITTER_CONSUMER_SECRET,
    callbackURL: core.config.hostUrl + 'auth/twitter/callback'
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
  core.app.get('/auth/twitter', passport.authenticate('twitter'));
  core.app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/' }));
};
