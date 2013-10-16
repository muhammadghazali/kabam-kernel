'use strict';
var LocalStrategy = require('passport-local').Strategy;


function jsonHandler(request, response, next, user) {
  if (!user) {
    response.status(400);
    response.json({errors: {form: 'Incorrect username or password'}});
    return;
  }
  if (!user.emailVerified) {
    response.status(403);
    response.json({errors: {form: 'Email is not verified yet'}});
    return;
  }
  request.login(user, function (err) {
    if (err) {
      return next(err);
    }
    response.json(user.export());
  });
}

function formHandler(request, response, next, user) {
  if (!user) {
    request.flash('error', 'Incorrect username or password');
    response.redirect('/auth/failure');
    return;
  }
  if (!user.emailVerified) {
    request.flash('error', 'Email is not verified yet');
    response.redirect('/auth/failure');
    return;
  }
  request.login(user, function (err) {
    if (err) {
      return next(err);
    }
    request.flash('info', 'Welcome, ' + user.username + '!');
    response.redirect('/auth/success');
  });
}


exports.name = 'kabam-core-strategies-local';

exports.strategy = function (core) {
  return new LocalStrategy(
    function (username, password, done) {
      core.model.User.findOneByLoginOrEmail(username, function (err, user) {
        if (err) { return done(err, false);}
        if (!user) {return done(null, false);}

        if (user.verifyPassword(password)) {
          done(null, user);
        } else {
          return done(null, false);
        }
      });
    }
  );
};

exports.routes = function (core) {
  //autorization by password and username
  core.app.post('/auth/login', function (request, response, next) {
    core.passport.authenticate('local', function (err, user/*, info*/) {
      if (err) {
        return next(err);
      }
      if (request.is('json')) {
        jsonHandler(request, response, next, user);
      } else {
        formHandler(request, response, next, user);
      }
    })(request, response, next);
  });
};

