var GitHubStrategy = require('passport-github').Strategy;


exports.strategy = function (core) {
  return new GitHubStrategy({
    clientID: core.config.passport.GITHUB_CLIENT_ID,
    clientSecret: core.config.passport.GITHUB_CLIENT_SECRET,
//    scope:['user:email'], //http://developer.github.com/v3/oauth/#scopes
    callbackURL: core.config.hostUrl + 'auth/github/callback',
    userAgent: core.config.hostUrl
  }, function (accessToken, refreshToken, profile, done) {
//    console.log('==============');
//    console.log(profile);
//    console.log('==============');
    if(profile.provider === 'github' && profile.id){
      core.model.Users.findOneByKeychain('github',profile.id, function(err,userFound){
        if(err) {
          done(err);
        } else {
          if(userFound){
            done(null,userFound);
          } else {
            done(null,profile);
          }
        }
      });
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });
};

exports.routes = function(passport,core){
  core.app.get('/auth/github',
    function(request,response,next){
      if(request.user){
        request.session.userToBeExtended = request.user.username;
      }
      next();
    },
    passport.authenticate('github'),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    });


  core.app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/' }),
    function (req, res) {
      //we need all this fiffles and fluffles to add github it to users keychain.
      //i know, this is ugly, but it works
      //to attach github id to current user keychain, signin as this user and visit url /auth/github
      //and this user has a keychain attached with github user id

      if(req.user.provider === 'github'){
        if(req.session.userToBeExtended){

          req.model.Users.findOneByLoginOrEmail(req.session.userToBeExtended,function(err,userFound){
            if(err) throw err;
            if(userFound){
              userFound.setKeyChain('github',req.user.id,function(err){
                if(err) throw err;
                req.flash('success','Github profile is attached to keychain!');
                req.user = userFound;
                res.redirect('/');
              });
            } else {
              req.flash('error','Unable to signin via github.com! Please, register with username, email and password and than attach your github profile to it!');
              req.logout();
              res.redirect('/');
            }
          });
        } else {
          req.flash('error','Unable to signin via github.com! Please, register with username, email and password and than attach your github profile to it!');
          req.logout();
          res.redirect('/');
        }
      } else {
        req.flash('info','Welcome to our site, '+req.user.username+'!');
        res.redirect('/');
      }
      });
};