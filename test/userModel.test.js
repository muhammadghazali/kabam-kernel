/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');

var MWC = mwcCore(config);
MWC.start('app');

describe('mwcCore - user model', function() {




  describe('Testing mwc_core mongoose model of users:', function(){
    it('exposes function find',function(){
      MWC.model.Users.find.should.be.a('function');
    });
    it('exposes function findOne',function(){
      MWC.model.Users.findOne.should.be.a('function');
    });
    it('exposes function findOneByLoginOrEmail',function(){
      MWC.model.Users.findOneByLoginOrEmail.should.be.a('function');
    });
    it('exposes function findOneByApiKey',function(){
      MWC.model.Users.findOneByApiKey.should.be.a('function');
    });
    it('exposes function count',function(){
      MWC.model.Users.count.should.be.a('function');
    });
    it('exposes function remove',function(){
      MWC.model.Users.remove.should.be.a('function');
    });
    it('exposes function create',function(){
      MWC.model.Users.create.should.be.a('function');
    });

    it('exposes function getByRole',function(){
      MWC.model.Users.getByRole.should.be.a('function');
    });

    it('exposes function signUp',function(){
      MWC.model.Users.signUp.should.be.a('function');
    });

    it('exposes function findOneByApiKeyAndVerify',function(){
      MWC.model.Users.findOneByApiKeyAndVerify.should.be.a('function');
    });

    it('exposes function findOneByApiKeyAndResetPassword',function(){
      MWC.model.Users.findOneByApiKeyAndResetPassword.should.be.a('function');
    });

    it('exposes function processOAuthProfile',function(){
      MWC.model.Users.processOAuthProfile.should.be.a('function');
    });


    describe('finders',function(){
      var usersFound;
      before(function (done) {
        MWC.model.Users.create({
          'username': 'testSubject47111',
          'email': 'ostroumov4@teksi.ru',
          'apiKey': 'vseBydetHorosho'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          async.parallel({
            'byLogin':function(cb){
              MWC.model.Users.findOneByLoginOrEmail('testSubject47111',cb);
            },
            'byEmail':function(cb){
              MWC.model.Users.findOneByLoginOrEmail('ostroumov4@teksi.ru',cb);
            },
            'byApiKey':function(cb){
              MWC.model.Users.findOneByApiKey('vseBydetHorosho',cb);
            },
            'created':function(cb){
              cb(null,userCreated);
            }
          },function(err,res){
            if(err) throw err;
            usersFound=res;
            done();
          });
        });
      });

      it('we created correct user to be sure',function(){
        usersFound.created.username.should.be.equal('testSubject47111');
        usersFound.created.email.should.be.equal('ostroumov4@teksi.ru');
        usersFound.created.apiKey.should.be.equal('vseBydetHorosho');
      });

      it('findOneByLoginOrEmail works for login',function(){
        usersFound.created._id.should.eql(usersFound.byLogin._id);
      });

      it('findOneByLoginOrEmail works for Email',function(){
        usersFound.created._id.should.eql(usersFound.byEmail._id);
      });

      it('findOneByApiKey works',function(){
        usersFound.created._id.should.eql(usersFound.byApiKey._id);
      });

      after(function (done) {
        usersFound.created.remove(done);
      });
    });

    describe('signUp',function(){
      var user;
      before(function(done){
        MWC.model.Users.signUp('johndoe','johndoe@example.org','waterfall',function(err,userCreated){
          if(err) throw err;
          user=userCreated;
          done();
        });
      });
      it('creates user with desired username',function(){
        user.username.should.be.equal('johndoe');
      });
      it('creates user with desired email',function(){
        user.email.should.be.equal('johndoe@example.org');
      });

      it('creates user with LOOOONG salt and password',function(){
        user.apiKey.length.should.be.above(63);
        user.apiKey.length.should.be.above(63);
      });

      it('creates user with desired password',function(){
        user.verifyPassword('waterfall').should.be.true;
        user.verifyPassword('fiflesAndFuffles').should.be.false;
      });

      it('creates user with apiKey present',function(){
        user.apiKey.length.should.be.above(5);
      });

      it('creates user with actual apiKey',function(){
        var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
        ago.should.be.below(10*1000); //10 seconds
      });

      it('creates user with emailVerified being FALSE',function(){
        user.emailVerified.should.be.false;
      });

      it('creates ordinary user, not root',function(){
        user.root.should.be.false;
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('signUpByEmailOnly',function(){
      var user;
      before(function(done){
        MWC.model.Users.signUpByEmailOnly('johndoe@example.org',function(err,userCreated){
          if(err) throw err;
          user=userCreated;
          done();
        });
      });

      it('creates user without username',function(){
        should.not.exist(user.username);
      });

      it('creates user with LOOOONG salt and password',function(){
        user.apiKey.length.should.be.above(63);
        user.apiKey.length.should.be.above(63);
      });

      it('creates user with apiKey present',function(){
        user.apiKey.length.should.be.above(5);
      });

      it('creates user with actual apiKey',function(){
        var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
        ago.should.be.below(10*1000); //10 seconds
      });

      it('creates user with emailVerified being TRUE',function(){
        user.emailVerified.should.be.true;
      });

      it('creates ordinary user, not root',function(){
        user.root.should.be.false;
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('findOneByApiKeyAndVerify',function(){
      var user,userBeingActivated;
      before(function (done) {
        MWC.model.Users.create({
          'username': 'oneByApiKey',
          'email': 'oneByApiKey@teksi.ru',
          'apiKey': 'vseBydetHoroshooneByApiKey',
          'emailVerified':false,
          'apiKeyCreatedAt':new Date()
        }, function (err, userCreated) {
          if(err) throw err;
          user=userCreated;
          MWC.model.Users.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey',function(err,userActivated){
            userBeingActivated=userActivated;
            done();
          });
        });
      });

      it('it finds the user we created',function(){
        userBeingActivated._id.should.eql(user._id);
      });

      it('set emailVerified to TRUE',function(){
        userBeingActivated.emailVerified.should.be.true;
      });

      after(function (done) {
        user.remove(done);
      });
    });

    describe('findOneByApiKeyAndResetPassword',function(){
      var user,userWithPasswordReseted;
      before(function(done){
        async.waterfall([

          function (cb) {
            MWC.model.Users.create({
              'username': 'iForgotMyPassWordIamStupid',
              'email': 'iForgotMyPassWordIamStupid@teksi.ru',
              'apiKey': 'iForgotMyPassWordIamStupid1111',
              'emailVerified': true,
              'apiKeyCreatedAt': new Date()
            }, function (err, userCreated) {
              user=userCreated;
              userCreated.setPassword('lalala',function(err){
                cb(err, userCreated);
              });
            });
          },
          function(user1,cb){
            MWC.model.Users.findOneByApiKeyAndResetPassword('iForgotMyPassWordIamStupid1111','lalala2',function(err1,userChanged){
              if(err1){
                cb(err1);
              } else {
                cb(null,userChanged);
              }
            });
          }
        ],
          function (err,userChanged2) {
            if (err) {
              throw err;
            }
            userWithPasswordReseted=userChanged2;
            done();
          });
      });

      it('it finds the user we created',function(){
        userWithPasswordReseted._id.should.eql(user._id);
      });

      it('and the user have new password',function(){
        userWithPasswordReseted.verifyPassword('lalala1').should.be.false;
        userWithPasswordReseted.verifyPassword('lalala2').should.be.true;
      });

      after(function (done) {
        user.remove(done);
      });
    });

    describe('processOAuthProfile for user in database',function(){
      var user,userFound;
      before(function(done){
        MWC.model.Users.signUp('johnDoe','johndoe@example.org','suzan123', function(err,userCreated){
          if(err) throw err;
          user=userCreated;
          MWC.model.Users.processOAuthProfile('johndoe@example.org',function(error,userFromProfile){
            if(error) throw error;
            userFound=userFromProfile;
            done();
          });

        });
      });

      it('finds exactly the user we need',function(){
        user._id.should.eql(userFound._id);
      });

      it('user is not verified as we need it',function(){
        user.emailVerified.should.be.false;
      });

      it('user have complete profile as we need it',function(){
        user.profileComplete.should.be.true;
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('processOAuthProfile for user NOT in database',function(){
      var user;
      before(function(done){
        MWC.model.Users.processOAuthProfile('johndoe@mail.ru',function(error,userFromProfile){
          if(error) throw error;
          user=userFromProfile;
          done();
        });
      });

      it('creates a uncompleted profile for this user',function(){
        user.email.should.be.equal('johndoe@mail.ru');
        user.emailVerified.should.be.true;
        user.profileComplete.should.be.false;
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('keychain',function(){

      describe('findByKeychain',function(){
        var user,userFound;

        before(function (done) {
          MWC.model.Users.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru',
            'apiKey':'lalala1',
            'keychain':{
              'github':11111
            }
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            MWC.model.Users.findOneByKeychain('github',11111,function(err,usr){
              userFound=usr;
              done();
            });
          });
        });

        it('finds correct user',function(){
          userFound._id.should.eql(user._id);
        });

        after(function (done) {
          user.remove(done)
        });
      });

      describe('setKeyChain',function(){
        var user,userUpdated;

        before(function (done) {
          MWC.model.Users.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru',
            'apiKey':'lalala1',
            'keychain':{
              'github':11111
            }
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            user.setKeyChain('someProvider',1,function(err2){
              if(err2) throw err2;
              MWC.model.Users.findOneByKeychain('someProvider',1,function(err,usr){
                userUpdated=usr;
                done();
              });
            });
          });

          it('finds correct user',function(){
            userUpdated._id.should.eql(user._id);
          });

          it('finds correct user',function(){
            userUpdated.keychain.github.should.be.equal(11111);
            userUpdated.keychain.someProvider.should.be.equal(1);
          });


          after(function (done) {
            user.remove(done)
          });
        });
      });

      describe('revokeKeyChain',function(){
        var user,userUpdated;

        before(function (done) {
          MWC.model.Users.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru',
            'apiKey':'lalala1',
            'keychain':{
              'github':11111,
              'someProvider':1
            }
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            user.setKeyChain('someProvider',1,function(err2){
              if(err2) throw err2;
              MWC.model.Users.revokeKeyChain('someProvider',function(err,usr){
                userUpdated=usr;
                done();
              });
            });
          });

          it('finds correct user',function(){
            userUpdated._id.should.eql(user._id);
          });

          it('finds correct user',function(){
            userUpdated.keychain.github.should.be.equal(11111);
            should.not.exist(userUpdated.keychain.someProvider);
          });


          after(function (done) {
            user.remove(done)
          });
        });
      });
    });

  });
  describe('Testing mwc_core mongoose model one instance of user:', function () {
    describe('general function are callable', function () {
      var user;

      before(function (done) {
        MWC.model.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          done();
        });
      });

      it('user instance have functions needed', function () {
        user.verifyPassword.should.be.a('function');
        user.setPassword.should.be.a('function');
        user.invalidateSession.should.be.a('function');

        user.grantRole.should.be.a('function');
        user.hasRole.should.be.a('function');
        user.revokeRole.should.be.a('function');

        user.notify.should.be.a('function');
        user.getGravatar.should.be.a('function');
        user.completeProfile.should.be.a('function');
      });

      it('user instance creates a proper gravatar url', function () {
        user.getGravatar().should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=300&d=wavatar&r=g');
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('functions setPassword, verifyPassword', function () {
      var user;
      before(function (done) {
        MWC.model.Users.create({
          'username': 'testSubject47_1',
          'email': 'ostroumov3@teksi.ru',
          'apiKey':'lalala1_1'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          user.setPassword('lalalaDaiMne3Ryblya', function (err) {
            if (err) {
              throw err;
            }
            done();
          });
        });
      });


      it('function verifyPassword returns true on correct password', function () {
        user.verifyPassword('lalalaDaiMne3Ryblya').should.equal(true);
      });

      it('function verifyPassword returns false on wrong password', function () {
        user.verifyPassword('sukapadla_Rozovi#Rassvet_SukePadle_DaliMnogoLet').should.equal(false);
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('function invalidateSession', function () {
      var user;
      before(function (done) {
        MWC.model.Users.create({
          'username': 'testSubject47_2',
          'email': 'ostroumov_3@teksi.ru',
          'apiKey': 'lalalaDaiMne3Ryblya'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          userCreated.invalidateSession(function (err2) {
            if (err2) {
              throw err2;
            }
            MWC.model.Users.findOne({'username': 'testSubject47_2'}, function (err3, userFound) {
              if (err3) {
                throw err3;
              }
              user = userFound;
              done();
            });
          });
        });
      });

      it('changes the apiKey', function () {
        var test = (user.apiKey === 'lalalaDaiMne3Ryblya');
        test.should.equal(false);
      });

      after(function (done) {
        user.remove(done)
      });
    });

    describe('function hasRole',function(){
      var user;
      before(function(done){
        MWC.model.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1',
          'roles':'role1'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          done();
        });
      });

      it('returns true if role assigned',function(){
        user.hasRole('role1').should.be.true;
      });

      it('returns false if role is not assigned',function(){
        user.hasRole('role2').should.be.false;
      });
      after(function(done){
        user.remove(done);
      });
    });

    describe('function grantRole',function(){
      var userWithRole;
      before(function(done){
        async.waterfall(
          [
            function(cb){
              MWC.model.Users.create({
                'username': 'test888',
                'email': 'ostroumov@teksi.ru',
                'apiKey':'lalala1'
              },cb);
            },
            function(aaa,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                userFound.grantRole('role2',function(err){
                  cb(err,true);
                });
              });
            },
            function(granted,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                cb(err,userFound);
              });
            }
          ],function(err,userFound){
            userWithRole = userFound;
            if(err) throw err;
            done();
          });
      });

      it('grants assigned role',function(){
        userWithRole.hasRole('role2').should.be.true;
      });

      after(function(done){
        userWithRole.remove(done);
      });
    });

    describe('function revokeRole',function(){
      var userWithOutRole;
      before(function(done){
        async.waterfall(
          [
            function(cb){
              MWC.model.Users.create({
                'username': 'test888',
                'email': 'ostroumov@teksi.ru',
                'apiKey':'lalala1',
                'roles':['role1','role2']
              },cb);
            },
            function(aaa,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                userFound.revokeRole('role2',function(err){
                  cb(err,true);
                });
              });
            },
            function(granted,cb){
              MWC.model.Users.findOneByLoginOrEmail('test888',function(err,userFound){
                cb(err,userFound);
              });
            }
          ],function(err,userFound){
            userWithOutRole = userFound;
            if(err) throw err;
            done();
          });
      });
      it('revokeRole leaved other roles intact',function(){
        userWithOutRole.hasRole('role1').should.be.true;
      });
      it('revokeRole removed desired role',function(){
        userWithOutRole.hasRole('role2').should.be.false;
      });

      after(function(done){
        userWithOutRole.remove(done);
      });
    });

    describe('function notify',function(){
      var user,
        messageObj;
      before(function(done){
        MWC.model.Users.create({
          'username': 'test888',
          'email': 'ostroumov@teksi.ru',
          'apiKey':'lalala1'
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;

          setTimeout(function(){
            user.notify('Hello!');
          },300);

          MWC.on('notify',function(message){
            messageObj=message;
            done();
          });
        });
      });

      it('makes mwc core emit events with message created properly',function(){
        messageObj.type.should.be.equal('text');
        messageObj.user.should.eql(user);
        messageObj.message.should.be.equal('Hello!');
      });

      after(function(done){
        user.remove(done);
      });
    });

    describe('completeProfile',function(){
      var user,userCompleted;
      before(function(done){
        MWC.model.Users.create({
          'email': 'emptyness@teksi.ru',
          'apiKey':'lalala1',
          'profileComplete':false,
          'emailVerified':true
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          userCreated.completeProfile('Anatolij','thePerpendicularReality',function(err1){
            if(err1) throw err1;
            MWC.model.Users.findOneByLoginOrEmail('Anatolij',function(err2,userFound){
              if(err2) throw err2;
              userCompleted=userFound;
              done();
            });
          });
        });
      });

      it('it finds the user we created',function(){
        userCompleted._id.should.eql(user._id);
      });

      it('set profileComplete to TRUE',function(){
        userCompleted.profileComplete.should.be.true;
      });

      it('sets the username properly', function(){
        userCompleted.username.should.be.equal('Anatolij');
      });

      it('sets the password properly', function(){
        userCompleted.verifyPassword('thePerpendicularReality').should.be.true;
      });

      after(function(done){
        user.remove(done);
      });
    });
  });


});