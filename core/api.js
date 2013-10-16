'use strict';
var async = require('async');

exports.name = 'kabam-core-api';
exports.routes = function(kernel){
  //registration by username, password and email
  //todo - implement the https://npmjs.org/packages/captcha
  kernel.app.post('/auth/signup', function (request, response) {
    request.model.User.signUp(request.body.username, request.body.email, request.body.password,
      function (err, userCreated) {
        if (request.is('json')) {
          if (err) {
            response.json(400, {
              errors: {form: err.message}
            });
          } else {
            userCreated.notify('email', {'subject': 'Account confirmation', 'template': 'signin'});
            response.json(201, {
              'username': userCreated.username,
              'email': userCreated.email
            });
          }
        } else {
          if (err) {
            request.flash('error', err.message);
          } else {
            userCreated.notify('email', {'subject': 'Account confirmation', 'template': 'signin'});
            request.flash('info', 'You have been registered! Please, check your email for instructions!');
          }
          response.redirect('/');
        }
      }
    );
  });

  //verify that login/email is not busy! - to be called by ajax
  kernel.app.post('/auth/isBusy', function (request, response) {
    async.parallel({
      'username': function (cb) {
        var username = request.body.username;
        if (username) {
          if (/^[a-zA-Z0-9_]{3,32}$/.test(username)) { //username looks OK
            request.model.User.findOne({'username': username}, function (err, userFound) {
              cb(err, (userFound ? 'USERNAME_BUSY' : 'OK'));
            });
          } else {
            cb(null, 'BAD_USERNAME');//username looks bad
          }
        } else {
          cb(null, 'EMPTY_USERNAME');//username is empty
        }
      },
      'email': function (cb) {
        var email = request.body.email;
        if (email) {
          // https://github.com/chriso/node-validator/blob/master/lib/validators.js#L27
          if (/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/.test(email)) { //email looks OK
            request.model.User.findOne({'email': email}, function (err, userFound) {
              cb(err, (userFound ? 'EMAIL_BUSY' : 'OK'));
            });
          } else {
            cb(null, 'BAD_EMAIL');//email looks bad
          }
        } else {
          cb(null, 'EMPTY_EMAIL');//email is empty
        }
      }
    }, function (err, results) {
      if (err) {
        throw err;
      }
      setTimeout(function () {
        response.json(results);
      }, Math.floor(Math.random() * 1000));//to make sad time based analysis that try to guess user's accounts
    });
  });

  kernel.app.post('/auth/profile',function (request, response){
    if(!request.user){return response.send(401);}

    var fields =['firstName', 'lastName', 'skype'];
    fields.map(function(p){
      // jshint expr: true
      request.body[p] && (request.user[p] = request.body[p]);
    });


    // password change: if we have a new password we should verify old first
    if(request.body.newPassword){
      // if user doesn't have a password yet (signed up using oauth) then we don't need to check password
      // but if they have, they definitely we have to
      if(!request.user.password || request.user.verifyPassword(request.body.password)){
        request.user.setPassword(request.body.newPassword);
      } else {
        return response.json(400, {errors: {password: 'Incorrect password'}});
      }
    }

    request.user.save(function(err){
      if(err) {return response.json(400, {errors: err.message});}
      response.json(200, request.user.export());
    });
  });

  //route to ask for password reset email
  kernel.app.post('/auth/restoreAccount', function (request, response) {
    var message = 'Check your email address, we send you instructions for restoring account';
    if (request.body.email) {
      request.model.User.findOneByLoginOrEmail(request.body.email, function (err, userFound) {
        if (err) {
          throw err;
        }
        if (userFound) {
          userFound.invalidateSession(function (err) {
            if (err) {
              throw err;
            }
            userFound.notify('email', {'template': 'restore'});
          });
        }
        if (request.is('json')) {
          response.json({message: message});
        } else {
          request.flash('success', message);
          response.redirect('back');
        }
      });
    } else {
      response.send(400);
    }
  });
  //route to reset password
  kernel.app.post('/auth/resetPassword', function (request, response) {
    if (request.body.apiKey && request.body.password) {
      request.model.User.findOneByApiKeyAndResetPassword(request.body.apiKey, request.body.password, function (err) {
        if (err) {
          if (request.is('json')) {
            response.json({error: err.message});
            return;
          }
          request.flash('error', err.message);
        } else {
          if (request.is('json')) {
            response.json({message: 'Thanks! Your password is reset!'});
            return;
          }
          request.flash('success', 'Thanks! Your password is reset!');
        }
        response.redirect('/');
      });
    } else {
      response.send(400, 'Wrong request! apiKey and password are missed!');
    }
  });

  //because if it were get we can irritate users by <img src='http://example.org/auth/logout' title='' alt=''/> on our site)
  kernel.app.post('/auth/logout', function (request, response) {
    request.logout();
    response.send(200, 'OK');
  });

  //success redirect for every oauth strategy
  kernel.app.get('/auth/success', function (request, response) {
    var message;
    if (!(request.session && request.session.redirectTo)) {
      return  response.redirect('/');
    }
    if(response.locals.flash && response.locals.flash.success){
      message = response.locals.flash.success;
    }
    if (request.user) {
      request.flash('success', message || 'Welcome to our site, ' + request.user.username + '!');
    }
    var r = request.session.redirectTo;
    request.session.redirectTo = null;
    response.redirect(r);
  });

  kernel.app.get('/auth/failure', function (request, response) {
    var message;
    if (!(request.session && request.session.redirectTo)) {
      return response.redirect('/');
    }
    if(response.locals.flash && response.locals.flash.error){
      message = response.locals.flash.error;
    }
    request.flash('error', message || 'Unable to sign in to this site!');
    var r = request.session.redirectTo;
    request.session.redirectTo = null;
    response.redirect(r);
  });
};