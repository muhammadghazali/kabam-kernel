'use strict';
var LocalStrategy = require('passport-local').Strategy;

exports.strategy = function (core) {
  return new LocalStrategy(
      function (username, password, done) {
        core.model.Users.findOneByLoginOrEmail(username, function (err, user) {
          if (err) {
            return done(err, false);
          } else {
            if (user) {
              if (user.verifyPassword(password)) {
                user.invalidateSession(function (err, newApiKey) {
                  if (err) {
                    done(err, false);
                  } else {
                    user.apiKey = newApiKey;
                    done(null, user);
                  }
                });
              } else {
                return done(null, false);
              }
            } else {
              return done(null, false);
            }
          }
        });
      }
    );
};

exports.routes = function (passport, core) {
    //autorization by password and username
    core.app.post('/auth/login', function (request, response, next) {
      passport.authenticate('local', function (err, user, info) {
        if (err) {
          next(err);
        }
        if (user) {
          if (request.is('json')) {
            request.login(user, function (err) {
              if (err) {
                next(err);
              }
              response.json(user.export());
            });
          } else {
            request.login(user, function (err) {
              if (err) {
                request.flash('error', err.message);
              } else {
                request.flash('info', 'Welcome, ' + user.username + '!');
              }
              return response.redirect('/');
            });
          }
        } else {
          if (request.is('json')) {
            response.status(400);
            response.json({errors: {form: 'Incorrect username or password'}});
          } else {
            request.flash('error', 'Incorrect username or password');
            response.redirect('/');
          }
        }
      })(request, response, next);
    });
};
