/*jshint immed: false */
'use strict';
var should = require('should'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').testing,
  request = require('request'),
  port = Math.floor(2000 + 1000 * Math.random());
//*
describe('Kernel events emitter testing', function () {

  var kabam, connection;
  var isStarted = false;
  before(function (done) {
    kabam = kabamKernel(config);

    connection = mongoose.createConnection(config.MONGO_URL);
    // We should first connect manually to the database and delete it because if we would use kabam.mongoConnection
    // then models would not recreate their indexes because mongoose would initialise before we would drop database.
    kabam = kabamKernel(config);
    connection.on('open', function(){
      connection.db.dropDatabase(function () {
        kabam.on('started', function () {
          done();
        });
        isStarted = true;
        kabam.start(port);
      });
    });
  });

  it('checking start event', function () {
    isStarted.should.be.true;
  });

  describe('Testing users:signUp', function () {
    var user;
    before(function (done) {
      kabam.model.User.signUp('ff', 'ff@example.org', 'waterfall', function (err, userCreated) {
        if (err) {
          throw err;
        }
      });
      kabam.on('users:signUp', function (u) {
        user = u;
        done();
      });
    });
    it('signUp with desired username', function () {
      user.username.should.be.equal('ff');
    });
    it('signUp with desired email', function () {
      user.email.should.be.equal('ff@example.org');
    });
    it('check emailVerified', function () {
      user.emailVerified.should.be.false;
    });
    it('check profilecomplete', function () {
      user.profileComplete.should.be.true;
    });
    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:signUpByEmailOnly event', function () {
    var user;
    before(function (done) {
      kabam.model.User.signUpByEmailOnly('abde@gmail.com', function (err, userCreated) {
        if (err) {
          throw err;
        }
      });

      kabam.on('users:signUpByEmailOnly', function (u) {
        user = u;
        done();
      });
    });
    it('signUp with desired email', function () {
      user.email.should.be.equal('abde@gmail.com');
    });
    it('signUp with desired username', function () {
      should.not.exist(user.username);
    });
    it('check emailVerified', function () {
      user.emailVerified.should.be.true;
    });
    it('check profilecomplete', function () {
      user.profileComplete.should.be.false;
    });
    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:completeProfile event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hggg@dddf.sg',
        'profileComplete': false
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        userCreated.completeProfile('hrrt', 'abcd12', function (err1) {
          if (err1) {
            throw err1;
          }
          user = userCreated;
        });
      });

      kabam.on('users:completeProfile', function (u) {
        done();
      });
    });
    it('check email', function () {
      user.email.should.be.equal('hggg@dddf.sg');
    });
    it('completeProfile test username', function () {
      user.username.should.be.equal('hrrt');
    });
    it('check profilecomplete', function () {
      user.profileComplete.should.be.true;
    });
    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:saveProfile event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy1@dddf.sg',
        'username': 'hzy1'
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        userCreated.saveProfile({
          'firstName': 'hhh',
          'lastName': 'zy',
          'age': 32,
          'sex': 'm'
        }, function (err) {
          if (err) {
            throw error;
          }
        });

      });

      kabam.on('users:saveProfile', function (u) {
        user = u;
        done();
      });
    });
    it('check profile', function () {
      user.profile.firstName.should.be.equal('hhh');
      user.profile.lastName.should.be.equal('zy');
      user.profile.age.should.be.equal(32);
      user.profile.sex.should.be.equal('m');
    });

    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:revokeRole event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy3@dddf.sg',
        'username': 'hzy3',
        'roles': ['role1', 'role2']
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        userCreated.revokeRole('role1', function (err) {
          if (err) {
            throw err;
          }
        });

      });

      kabam.on('users:revokeRole', function (u) {
        user = u;
        done();
      });
    });
    it('saveProfile test event', function () {
      user.roles[0].should.be.equal('role2');
    });

    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:setKeyChain event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy5@dddf.sg'
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        kabam.model.User.findOneByLoginOrEmail('hzy5@dddf.sg', function (err, userFound) {
          if (err) {
            throw err;
          }
          userFound.setKeyChain('paradise', 'with_Iuda', function (err) {
            if (err) {
              throw err;
            }
          });
        });

      });


      kabam.on('users:setKeyChain', function (u) {
        user = u;
        done();
      });
    });
    it('setKeyChain test event', function () {
      user.keychain.should.have.property('paradise', 'with_Iuda');
    });

    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:revokeKeyChain event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy6@dddf.sg',
        'keychain': {
          'github': 11111,
          'foursquare': 222
        }
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }
        userCreated.revokeKeyChain('github', 11111, function (err2) {
          if (err2) {
            throw err2;
          }
        });
      });


      kabam.on('users:revokeKeyChain', function (u) {
        user = u;
        //console.log(u);
        done();
      });
    });
    it('revokeKeyChain test event', function () {
      should.not.exist(user.keychain.github);
    });

    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:findOneByApiKeyAndVerify event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy15@dddf.sg',
        'apiKey': 'vseBydetHoroshooneByApiKey4',
        'emailVerified': false,
        'apiKeyCreatedAt': new Date()
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        kabam.model.User.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey4', function (err, userActivated) {
          if (err) {
            throw err;
          }
        });
      });


      kabam.on('users:findOneByApiKeyAndVerify', function (u) {
        user = u;
        //console.log(u);
        done();
      });
    });
    it('findOneByApiKeyAndVerify test event', function () {
      user.apiKey.should.be.equal('vseBydetHoroshooneByApiKey4');
    });

    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing http event', function () {
    var data;
    before(function (done) {
      request.get('http://localhost:' + port + '/', function (err, response, body) {
        if (err) {
          throw err;
        }
      });

      kabam.on('http', function (params) {
        data = params;
        done();
      });
    });
    it('check http method parameter', function () {
      should.exist(data.method);
    });
    it('check http duration parameter', function () {
      data.duration.should.be.below(100);
    });
    it('check http statuscode parameter', function () {
      should.exist(data.statusCode);
    });
    it('check http ip parameter', function () {
      should.exist(data.ip);
    });
    it('check http uri parameter', function () {
      should.exist(data.uri);
    });
  });

  describe('Testing users:unban (without email)event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy23@dddf.sg',
        'isBanned': true
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        userCreated.unban(function () {
        });
      });


      kabam.on('users:unban', function (u) {
        user = u;
        done();
      });
    });
    it('unban test event', function () {
      user.isBanned.should.be.false;
    });

    after(function (done) {
      user.remove(done);
    });
  });

  describe('Testing users:ban (with email)event', function () {
    var user;
    before(function (done) {
      kabam.model.User.create({
        'email': 'hzy27@dddf.sg'
      }, function (err, userCreated) {
        if (err) {
          throw err;
        }

        kabam.model.User.ban('hzy27@dddf.sg', function () {
        });
      });


      kabam.on('users:ban', function (u) {
        user = u;
        done();
      });
    });
    it('ban test event', function () {
      user.isBanned.should.be.true;
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
//*/
