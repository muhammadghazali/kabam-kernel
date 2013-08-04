var GitHubStrategy = require('passport-github').Strategy;


exports.strategy = function (core) {
  return new GitHubStrategy({
    clientID: core.config.passport.GITHUB_CLIENT_ID,
    clientSecret: core.config.passport.GITHUB_CLIENT_SECRET,
    callbackURL: core.config.hostUrl + 'auth/github/callback'
  }, function (accessToken, refreshToken, profile, done) {
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
  //if we have set parameters for github, enable the github passport strategy
  core.app.get('/auth/github', passport.authenticate('github'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });
  core.app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
    function (req, res) {
      res.redirect('/');
    });
};