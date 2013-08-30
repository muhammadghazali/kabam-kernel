var should = require('should'),
  KabamKernel =  require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request')
  //port = Math.floor(2000 + 1000 * Math.random());

describe('auth api testing', function() {

    var kabam;
    before(function(done) {
        kabam = KabamKernel(config);

        kabam.start(3011);
        setTimeout(done, 1000);
    });

    describe('Testing /auth/signup route', function() {
        var response,
        body,
        user
        before(function(done) {
            request({
                'url': 'http://localhost:3011/auth/signup',
                'method': 'POST',
                'json': {
                    "username": "usernameToUseForNewUser",
                    "email": "emailForNewUser@example.org",
                    "password": "myLongAndHardPassword"
                }
            },
          function(err, r, b) {
              if(err) {
                  throw err;
              }
              response = r;
              body = b;
              kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function(err, userFound) {
                  if(err) {
                      throw err;
                  }
                  user = userFound;
                  done();
              });

          });
        });

        it('check response username', function() {
            body.username.should.be.equal('usernameToUseForNewUser');
        });
        it('check response email', function() {
            body.email.should.be.equal('emailForNewUser@example.org');
        });
        it('check proper response for it', function() {
            response.statusCode.should.be.equal(201);
        });
        after(function(done) {
            user.remove(done);
        });
    });
    describe('Testing /auth/login route', function() {
        var response,
        body,
        user
        before(function(done) {
            request({
                'url': 'http://localhost:3011/auth/signup',
                'method': 'POST',
                'json': {
                    "username": "usernameToUseForNewUser",
                    "email": "emailForNewUser@example.org",
                    "password": "myLongAndHardPassword"
                }
            },
          function(err, r, b) {
              if(err) {
                  throw err;
              }
              kabam.model.User.findOneByLoginOrEmail('emailForNewUser@example.org', function(err, userFound) {
                  if(err) {
                      throw err;
                  }
                  user = userFound;
                  request({
                      'url': 'http://localhost:3011/auth/login',
                      'method': 'POST',
                      'json': {
                            "username": "usernameToUseForNewUser",
                            "password": "myLongAndHardPassword"
                        }
                  },
                  function(err, r1, b1) {
                      if(err) {
                          throw err;
                      }
                      response = r1;
                      body = b1;
                      done();
                  });
              });

          });
        });
        it('check response username', function() {
            body.username.should.be.equal('usernameToUseForNewUser');
        });
        it('check response email', function() {
            body.email.should.be.equal('emailForNewUser@example.org');
        });
        it('check proper response for it', function() {
            response.statusCode.should.be.equal(200);
        });
        after(function(done) {
            user.remove(done);
        });
    });
    after(function(done) {
        kabam.stop();
        done();
    });
});

