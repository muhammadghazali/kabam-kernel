/*jshint immed: false */
'use strict';
var should = require('should'),
  mongoose = require('mongoose'),
  KabamKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').testing,
  request = require('request'),
  port = Math.floor(2000 + 1000 * Math.random());

describe('auth api testing', function () {

  var kabam, connection;
  before(function (done) {

    config.DISABLE_CSRF = true;
    kabam = KabamKernel(config);

    connection = mongoose.createConnection(config.MONGO_URL);
    // We should first connect manually to the database and delete it because if we would use kabam.mongoConnection
    // then models would not recreate their indexes because mongoose would initialise before we would drop database.
    kabam = KabamKernel(config);
    connection.on('open', function(){
      connection.db.dropDatabase(function () {
        kabam.on('started', function () {
          done();
        });
        kabam.start(port);
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
    function createUser(callback){
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
              "username": "usernameToUseForNewUser",
              "password": "myLongAndHardPassword"
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
            'url': 'http://localhost:' + port + '/auth/completeProfile?kabamkey=' + userCreated.apiKey,
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

