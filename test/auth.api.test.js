/*jshint immed: false */
'use strict';
var should = require('should'),
  KabamKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request'),
  port = Math.floor(2000 + 1000 * Math.random());

describe('auth api testing', function () {

  var kabam;
  before(function (done) {

    kabam = KabamKernel({
      'hostUrl': 'http://localhost:' + port,
      'mongoUrl': 'mongodb://localhost/mwc_dev',
      'disableCsrf': true // NEVER DO IT!
    });

    kabam.on('started', function (evnt) {
      done();
    });
    // kabam.usePlugin(require('./../index.js'));
    kabam.start(port);
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
            "username": "usernameToUseForNewUser",
            "email": "emailForNewUser@example.org",
            "password": "myLongAndHardPassword"
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
    var response,
      body,
      user;
    before(function (done) {
      request({
          'url': 'http://localhost:' + port + '/auth/signup',
          'method': 'POST',
          'json': {
            "username": "usernameToUseForNewUser",
            "email": "emailForNewUser@example.org",
            "password": "myLongAndHardPassword"
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
                'url': 'http://localhost:' + port + '/auth/login',
                'method': 'POST',
                'json': {
                  "username": "usernameToUseForNewUser",
                  "password": "myLongAndHardPassword"
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
    it('check response username', function () {
      body.username.should.be.equal('usernameToUseForNewUser');
    });
    it('check response email', function () {
      body.email.should.be.equal('emailForNewUser@example.org');
    });
    it('check proper response for it', function () {
      response.statusCode.should.be.equal(200);
    });
    after(function (done) {
      user.remove(done);
    });
  });
  describe('Testing /auth/completeProfile', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'emailForNewUser@example.org',
        'profileComplete': false
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }
        user = userCreated;
        request({
            'url': 'http://localhost:' + port + '/auth/completeProfile?mwckey=' + userCreated.apiKey,
            'method': 'POST',
            'json': {
              "username": "usernameToUseForNewUser",
              "password": "myLongAndHardPassword"
            }
          },
          function (err, r1, b1) {
            if (err) {
              throw err;
            }
            kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function (err, userFound) {
              if (err) {
                throw err;
              }
              user = userFound;
              done();
            });
          });
      });
    });
    it('check username', function () {
      user.username.should.be.equal('usernameToUseForNewUser');
    });
    it('check profilecomplete', function () {
      user.profileComplete.should.be.true;
    });
    after(function (done) {
      user.remove(done);
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
            "username": "usernameToUseForNewUser",
            "email": "emailForNewUser@example.org",
            "password": "myLongAndHardPassword"
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
      response.socket._httpMessage.path.should.equal('/')
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

