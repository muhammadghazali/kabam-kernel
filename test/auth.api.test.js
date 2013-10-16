/*jshint immed: false, expr: true */
'use strict';
// jshint unused: false
var should = require('should'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  config = require('./../example/config.json').testing,
  request = require('request');

describe('auth api testing', function () {
  var kabam, connection, port = Math.floor(2000 + 1000 * Math.random());
  before(function (done) {

    config.DISABLE_CSRF = true;
    connection = mongoose.createConnection(config.MONGO_URL);
    // We should first connect manually to the database and delete it because if we would use kabam.mongoConnection
    // then models would not recreate their indexes because mongoose would initialise before we would drop database.
    kabam = kabamKernel(config);
    connection.on('open', function(){
      connection.db.dropDatabase(function () {
        try {
          kabam.on('started', function () {
            done();
          });
          kabam.start(port);
        } catch(e){
          done(e);
        }
      });
    });
  });

  describe('Testing /auth/signup route', function () {
    var response,
      body,
      user;
    before(function (done) {
      request({
          'url': 'http://localhost:' + port + '/auth/signup',
          'method': 'POST',
          'json': {
            username: 'usernameToUseForNewUser',
            email: 'emailForNewUser@example.org',
            password: 'myLongAndHardPassword'
          }
        },
        function (err, r, b) {
          if (err) {
            throw err;
          }
          response = r;
          body = b;
          kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, userFound) {
            if (err) {
              throw err;
            }
            user = userFound;
            done();
          });

        });
    });

    it('check response username', function () {
      body.username.should.be.equal('usernameToUseForNewUser');
    });
    it('check response email', function () {
      body.email.should.be.equal('emailForNewUser@example.org');
    });
    it('check proper response for it', function () {
      response.statusCode.should.be.equal(201);
    });
    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing /auth/login route', function () {
    function createUser(callback){
      request({
          'url': 'http://localhost:' + port + '/auth/signup',
          'method': 'POST',
          'json': {
            username: 'usernameToUseForNewUser',
            email: 'emailForNewUser@example.org',
            password: 'myLongAndHardPassword'
          }
        },
        function (err, r, b) {
          if (err) {
            throw err;
          }
          r.statusCode.should.be.equal(201);
          kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, user) {
            if (err) {
              throw err;
            }
            callback(user);
          });
        });
    }

    describe('Trying to log in with unverified email', function(){
      var user, response, body;
      before(function(done){
        createUser(function(_user){
          request({
            'url': 'http://localhost:' + port + '/auth/login',
            'method': 'POST',
            'json': {
              'username': 'usernameToUseForNewUser',
              'password': 'myLongAndHardPassword'
            }
          },
          function (err, r, b) {
            if (err) {
              throw err;
            }
            user = _user;
            response = r;
            body = b;
            done();
          });
        });
      });
      after(function (done) {
        user.remove(done);
      });
      it('should return 403', function () {
        response.statusCode.should.be.equal(403);
      });
    });

    describe('Trying to login with with verified email', function(){
      var user, response, body;
      before(function(done){
        createUser(function(_user){
          user = _user;
          user.set('emailVerified', true);
          user.save(function(err){
            if(err){
              throw err;
            }
            request({
                'url': 'http://localhost:' + port + '/auth/login',
                'method': 'POST',
                'json': {
                  username: 'usernameToUseForNewUser',
                  password: 'myLongAndHardPassword'
                }
              },
              function (err, r1, b1) {
                if (err) {
                  throw err;
                }
                response = r1;
                body = b1;
                done();
              });
          });
        });
      });
      after(function (done) {
        user.remove(done);
      });
      it('check proper response for it', function () {
        response.statusCode.should.be.equal(200);
      });
      it('check response username', function () {
        body.username.should.be.equal('usernameToUseForNewUser');
      });
      it('check response email', function () {
        body.email.should.be.equal('emailForNewUser@example.org');
      });
    });
  });
  describe('Testing /auth/profile', function () {
    var user;
    before(function (done) {
      var profile = {
        'email': 'emailForNewUser@example.org',
        'profileComplete': false
      };
      kabam.model.User.create(profile, function (err, userCreated) {
        if (err) {throw err;}
        user = userCreated;
        request({
            'url': 'http://localhost:' + port + '/auth/profile?kabamkey=' + userCreated.apiKey,
            'method': 'POST',
            'json': {
              'firstName': 'John',
              'lastName': 'Malkovich'
            }
          },
          function (err/*, r1, b1*/) {
            if (err) {throw err;}
            kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, userFound) {
              if (err) {throw err;}
              user = userFound;
              done();
            });
          }
        );
      });
    });
    after(function (done) {
      user.remove(done);
    });
    it('should save fistName', function () {
      user.firstName.should.be.equal('John');
    });
    it('should save lastName', function () {
      //noinspection BadExpressionStatementJS
      user.lastName.should.be.equal('Malkovich');
    });

    describe('Password change', function(){
      it('should save the new password without asking for an old one if the user doesn\'t have it', function(done){
        request({
          'url': 'http://localhost:' + port + '/auth/profile?kabamkey=' + user.apiKey,
          'method': 'POST',
          'json': {
            'newPassword': 'qweqwe'
          }
        }, function(err, res/*, body*/){
          res.statusCode.should.be.equal(200);
          done();
        });
      });
      it('should return error if we supply wrong old password', function(done){
        request({
          'url': 'http://localhost:' + port + '/auth/profile?kabamkey=' + user.apiKey,
          'method': 'POST',
          'json': {
            'password': 'wrong',
            'newPassword': 'pwned'
          }
        }, function(err, res, body){
          res.statusCode.should.be.equal(400);
          body.should.have.property('errors');
          body.errors.should.have.property('password');
          kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, user) {
            user.verifyPassword('qweqwe').should.be.true;
            done();
          });
        });
      });
      it('should change password if old password is correct', function(done){
        request({
          'url': 'http://localhost:' + port + '/auth/profile?kabamkey=' + user.apiKey,
          'method': 'POST',
          'json': {
            'password': 'qweqwe',
            'newPassword': 'topsykrets'
          }
        }, function(err, res/*, body*/){
          res.statusCode.should.be.equal(200);
          kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, user) {
            user.verifyPassword('topsykrets').should.be.true;
            done();
          });
        });
      });
    });
  });
  describe('Testing /auth/confirm/:apiKey route', function () {
    var response,
      body, data,
      user;
    before(function (done) {
      request({
          'url': 'http://localhost:' + port + '/auth/signup',
          'method': 'POST',
          'json': {
            username: 'usernameToUseForNewUser',
            email: 'emailForNewUser@example.org',
            password: 'myLongAndHardPassword'
          }
        },
        function (err, r, b) {
          if (err) {
            throw err;
          }
          kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, userFound) {
            if (err) {
              throw err;
            }
            user = userFound;
            request({
                'url': 'http://localhost:' + port + '/auth/confirm/' + user.apiKey,
                'method': 'GET'
              },
              function (err, r1, b1) {
                if (err) {
                  throw err;
                }
                response = r1;
                body = b1;
                done();
              });

          });

        });
    });

    it('check redirect path', function () {
      response.socket._httpMessage.path.should.equal('/');
    });
    after(function (done) {
      user.remove(done);
    });
  });
  after(function (done) {
    kabam.stop();
    done();
  });
});

describe('Signing in in multiple sessions', function(){
  var port = Math.floor(2000 + 1000 * Math.random()),
    r = request,
    host = 'http://localhost:' + port,
    kabam,
    connection;
  before(function(done){
    connection = mongoose.createConnection('mongodb://localhost/kabam_test');
    kabam = kabamKernel({MONGO_URL:'mongodb://localhost/kabam_test'});
    connection.on('open', function(){
      connection.db.dropDatabase(function () {
        kabam.on('started', function () {
          done();
        });
        kabam.start(port);
      });
    });
  });
  function signUp(done){
    var jar = r.jar(), request = r.defaults({jar: jar});
    // first request is just to get XSRF cookie
    request(host + '/auth/signup', function () {
      var xsrfToken = decodeURIComponent(jar.cookies.filter(function(c){return c.name === 'XSRF-TOKEN';})[0].value);
      request({
        url: host + '/auth/signup',
        method: 'POST',
        headers: {
          'x-xsrf-token': xsrfToken
        },
        json: {
          username: 'qweqwe',
          email: 'qweqwe@qwe.qwe',
          password: 'qweqwe'
        }
      }, function(err, res, body){
        if(err){return done(err);}
        body.should.be.eql({ username: 'qweqwe', email: 'qweqwe@qwe.qwe'});
        kabam.model.User.findOneByLoginOrEmail('qweqwe@qwe.qwe', function (err, user) {
          if(err){return done(err);}
          user.emailVerified = true;
          user.save(function(err){
            if(err){return done(err);}
            done();
          });
        });
      });
    });
  }
  function sessionBoundReq(done){
    var jar = r.jar(), request = r.defaults({jar: jar});
    request(host + '/auth/signup', function () {
      var xsrfToken = decodeURIComponent(jar.cookies.filter(function(c){return c.name === 'XSRF-TOKEN';})[0].value);
      request({
        url: host + '/auth/login',
        method: 'POST',
        headers: {
          'x-xsrf-token': xsrfToken
        },
        json: {
          username: 'qweqwe',
          password: 'qweqwe'
        }
      }, function(err/*, res, body*/){
        if(err){return done(err);}
        done(null, request, xsrfToken);
      });
    });
  }
  it('should allow a user to perform mutating operations in multiple sessions', function(done){
    signUp(function(err){
      if(err){return done(err);}
      sessionBoundReq(function(err, r1, xsrf1){
        if(err){return done(err);}
        sessionBoundReq(function(err, r2, xsrf2){
          if(err){return done(err);}
          r1({
            method: 'POST',
            url: host + '/auth/profile',
            headers: {
              'x-xsrf-token': xsrf1
            },
            json: {
              firstName: 'John'
            }
          }, function(err, res/*, body*/){
            if(err){return done(err);}
            res.statusCode.should.be.eql(200);

            r2({
              method: 'POST',
              url: host + '/auth/profile',
              headers: {
                'x-xsrf-token': xsrf2
              },
              json: {
                lastName: 'Malkovich'
              }
            }, function(err, res, body){
              if(err){return done(err);}
              res.statusCode.should.be.eql(200);
              //noinspection BadExpressionStatementJS
              body.profileComplete.should.be.true;
              done();
            });

          });
        });
      });
    });
  });
});