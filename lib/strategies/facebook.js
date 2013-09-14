'use strict';
var FacebookStrategy = require('passport-facebook').Strategy;

exports.strategy = function (core) {
  return new FacebookStrategy({
      clientID: core.config.passport.FACEBOOK_APP_ID,
      clientSecret: core.config.passport.FACEBOOK_APP_SECRET,
      callbackURL: core.config.hostUrl + 'auth/facebook/callback',
      passReqToCallback: true
    },
    function (request, accessToken, refreshToken, profile, done) {
//    console.log('==============AUTH VIA FACEBOOK');
//    console.log(profile);
//    console.log('==============');
      if (profile.provider === 'facebook' && profile.id) {
        if (request.user) {
          //attaching github profile
          request.user.setKeyChain('facebook', profile.id, function (err) {
            if (err) {
              throw err;
            }
            request.flash('success', 'Your facebook profile has been attached to your account! You can authorize via facebook.com now!');
            core.model.Users.findOneByKeychain('facebook', profile.id, function (err, userFound) {
              done(err, userFound);
            });
          });
        } else {
          core.model.Users.findOneByKeychain('facebook', profile.id, function (err, userFound) {
            if (err) {
              done(err);
            } else {
              if (userFound) {
                done(null, userFound);
              } else {
                request.flash('error', 'Unable to signin via facebook.com! Please, register with username, email and password and than attach your facebook profile to it!');
                done(null, false);
              }
            }
          });
        }
      } else {
        return done(new Error('There is something strange instead of user profile!'));
      }
    });
};

exports.routes = function (passport, core) {
  core.app.get('/auth/facebook', passport.authenticate('facebook'));
  core.app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/auth/success', failureRedirect: '/auth/failure' }));
};


