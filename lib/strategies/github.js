var GitHubStrategy = require('passport-github').Strategy;


exports.strategy = function (core) {
  return new GitHubStrategy({
    clientID: core.config.passport.GITHUB_CLIENT_ID,
    clientSecret: core.config.passport.GITHUB_CLIENT_SECRET,
//    scope:['user:email'], //http://developer.github.com/v3/oauth/#scopes
    callbackURL: core.config.hostUrl + 'auth/github/callback',
    userAgent: core.config.hostUrl,
    passReqToCallback: true
  }, function (request,accessToken, refreshToken, profile, done) {
//    console.log('==============');
//    console.log(profile);
//    console.log('==============');
    if(profile.provider === 'github' && profile.id){
      if(request.user){
        //attaching github profile
        request.user.setKeyChain('github', profile.id, function(err){
          request.flash('success','Your github profile has been attached to your account! You can authorize via Github.com now!');
          done(err,request.user)
        });
      } else {
        core.model.Users.findOneByKeychain('github',profile.id, function(err,userFound){
         if(err){
           done(err);
         } else {
           if(userFound){
             done(null,userFound);
           } else {
             request.flash('error','Unable to signin via github.com! Please, register with username, email and password and than attach your github profile to it!');
             done(null,false);
           }
         }
        });
      }
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};


exports.routes = function(passport,core){
  core.app.get('/auth/github',passport.authenticate('github'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });


  core.app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
    function (req, res) {
        req.flash('info','Welcome to our site, '+req.user.username+'!');
        res.redirect('/');
      }
  );
};