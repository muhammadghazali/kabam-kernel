/*jshint immed: false */
'use strict';
var should = require('should'),
  async = require('async'),
  kabamKernel = require('./../index.js'),
  config = require('./../example/config.json').testing,
  kabam;

// FIXME(chopachom): tests should not use development database,
// they should use test database and clean it up each time tests run
describe('c', function () {
  before(function (done) {
    // SIGINT fix (each app attaches SIGINT handler and it always grows);
    process.setMaxListeners(20);
    kabam = kabamKernel(config);
    kabam.on('started', function () {
      kabam.mongoConnection.on('open', function(){
        kabam.mongoConnection.db.dropDatabase(function () {
          done();
        });
      });
    });
    kabam.start('app');
  });

  describe('Users model', function () {

    describe('Testing kabam_core mongoose model of users:', function () {
      it('exposes function find', function () {
        kabam.model.User.find.should.be.a('function');
      });
      it('exposes function findOne', function () {
        kabam.model.User.findOne.should.be.a('function');
      });
      it('exposes function findOneByLoginOrEmail', function () {
        kabam.model.User.findOneByLoginOrEmail.should.be.a('function');
      });
      it('exposes function findOneByApiKey', function () {
        kabam.model.User.findOneByApiKey.should.be.a('function');
      });
      it('exposes function count', function () {
        kabam.model.User.count.should.be.a('function');
      });
      it('exposes function remove', function () {
        kabam.model.User.remove.should.be.a('function');
      });
      it('exposes function create', function () {
        kabam.model.User.create.should.be.a('function');
      });

      it('exposes function getByRole', function () {
        kabam.model.User.getByRole.should.be.a('function');
      });

      it('exposes function signUp', function () {
        kabam.model.User.signUp.should.be.a('function');
      });

      it('exposes function findOneByApiKeyAndVerify', function () {
        kabam.model.User.findOneByApiKeyAndVerify.should.be.a('function');
      });

      it('exposes function findOneByApiKeyAndResetPassword', function () {
        kabam.model.User.findOneByApiKeyAndResetPassword.should.be.a('function');
      });

      it('exposes function processOAuthProfile', function () {
        kabam.model.User.processOAuthProfile.should.be.a('function');
      });


      describe('finders', function () {
        var usersFound;
        before(function (done) {
          kabam.model.User.create({
            'username': 'testSubject47111',
            'email': 'ostroumov4@teksi.ru',
            'apiKey': 'vseBydetHorosho'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            async.parallel({
              'byLogin': function (cb) {
                kabam.model.User.findOneByLoginOrEmail('testSubject47111', cb);
              },
              'byEmail': function (cb) {
                kabam.model.User.findOneByLoginOrEmail('ostroumov4@teksi.ru', cb);
              },
              'byApiKey': function (cb) {
                kabam.model.User.findOneByApiKey('vseBydetHorosho', cb);
              },
              'created': function (cb) {
                cb(null, userCreated);
              }
            }, function (err, res) {
              if (err) {
                throw err;
              }
              usersFound = res;
              done();
            });
          });
        });

        it('we created correct user to be sure', function () {
          usersFound.created.username.should.be.equal('testSubject47111');
          usersFound.created.email.should.be.equal('ostroumov4@teksi.ru');
          usersFound.created.apiKey.should.be.equal('vseBydetHorosho');
        });

        it('findOneByLoginOrEmail works for login', function () {
          usersFound.created._id.should.eql(usersFound.byLogin._id);
        });

        it('findOneByLoginOrEmail works for Email', function () {
          usersFound.created._id.should.eql(usersFound.byEmail._id);
        });

        it('findOneByApiKey works', function () {
          usersFound.created._id.should.eql(usersFound.byApiKey._id);
        });

        after(function (done) {
          usersFound.created.remove(done);
        });
      });

      describe('signUp', function () {
        var user;
        before(function (done) {
          kabam.model.User.signUp('johndoe', 'johndoe@example.org', 'waterfall', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });
        it('creates user with desired username', function () {
          user.username.should.be.equal('johndoe');
        });
        it('creates user with desired email', function () {
          user.email.should.be.equal('johndoe@example.org');
        });

        it('creates user with LOOOONG salt and password', function () {
          user.apiKey.length.should.be.above(63);
          user.apiKey.length.should.be.above(63);
        });

        it('creates user with desired password', function () {
          user.verifyPassword('waterfall').should.be.true;
          user.verifyPassword('fiflesAndFuffles').should.be.false;
        });

        it('creates user with apiKey present', function () {
          user.apiKey.length.should.be.above(5);
        });

        it('creates user with actual apiKey', function () {
          var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
          ago.should.be.below(10 * 1000); //10 seconds
        });

        it('creates user with emailVerified being FALSE', function () {
          user.emailVerified.should.be.false;
        });

        it('creates ordinary user, not root', function () {
          user.root.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('signUpByEmailOnly', function () {
        var user;
        before(function (done) {
          kabam.model.User.signUpByEmailOnly('johndoe@example.org', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('creates user without username', function () {
          should.not.exist(user.username);
        });

        it('creates user with LOOOONG salt and password', function () {
          user.apiKey.length.should.be.above(63);
          user.apiKey.length.should.be.above(63);
        });

        it('creates user with apiKey present', function () {
          user.apiKey.length.should.be.above(5);
        });

        it('creates user with actual apiKey', function () {
          var ago = new Date().getTime() - user.apiKeyCreatedAt.getTime();
          ago.should.be.below(10 * 1000); //10 seconds
        });

        it('creates user with emailVerified being TRUE', function () {
          user.emailVerified.should.be.true;
        });

        it('creates ordinary user, not root', function () {
          user.root.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('findOneByApiKeyAndVerify for correct apiKey', function () {
        var user, userBeingActivated;
        before(function (done) {
          kabam.model.User.create({
            'username': 'oneByApiKey',
            'email': 'oneByApiKey@teksi.ru',
            'apiKey': 'vseBydetHoroshooneByApiKey',
            'emailVerified': false,
            'apiKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            kabam.model.User.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey', function (err, userActivated) {
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('it finds the user we created', function () {
          userBeingActivated._id.should.eql(user._id);
        });

        it('set emailVerified to TRUE', function () {
          userBeingActivated.emailVerified.should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndVerify for wrong apiKey', function () {
        var user, userBeingActivated, errorThrown;
        before(function (done) {
          kabam.model.User.create({
            'username': 'oneByApiKey',
            'email': 'oneByApiKey@teksi.ru',
            'apiKey': 'vseBydetHoroshooneByApiKey',
            'emailVerified': false,
            'apiKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            kabam.model.User.findOneByApiKeyAndVerify('vseIdetPoPlanu', function (err, userActivated) {
              errorThrown = err;
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do NOT returns the user', function () {
          should.not.exists(userBeingActivated);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndVerify for outdated apiKey', function () {
        var user, userBeingActivated, errorThrown;
        before(function (done) {
          kabam.model.User.create({
            'username': 'oneByApiKey',
            'email': 'oneByApiKey@teksi.ru',
            'apiKey': 'vseBydetHoroshooneByApiKey',
            'emailVerified': false,
            'apiKeyCreatedAt': new Date(1986, 1, 12, 11, 45, 36, 21)
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            kabam.model.User.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey', function (err, userActivated) {
              errorThrown = err;
              userBeingActivated = userActivated;
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do NOT returns the user', function () {
          should.not.exists(userBeingActivated);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('findOneByApiKeyAndResetPassword for good api key', function () {
        var user, userWithPasswordReseted;
        before(function (done) {
          async.waterfall([

            function (cb) {
              kabam.model.User.create({
                'username': 'iForgotMyPassWordIamStupid',
                'email': 'iForgotMyPassWordIamStupid@teksi.ru',
                'apiKey': 'iForgotMyPassWordIamStupid1111',
                'emailVerified': true,
                'apiKeyCreatedAt': new Date()
              }, function (err, userCreated) {
                if (err) {
                  throw err;
                }
                user = userCreated;
                userCreated.setPassword('lalala', function (err) {
                  cb(err, userCreated);
                });
              });
            },
            function (user1, cb) {
              kabam.model.User.findOneByApiKeyAndResetPassword('iForgotMyPassWordIamStupid1111', 'lalala2', function (err1, userChanged) {
                if (err1) {
                  cb(err1);
                } else {
                  cb(null, userChanged);
                }
              });
            }
          ],
            function (err, userChanged2) {
              if (err) {
                throw err;
              }
              userWithPasswordReseted = userChanged2;
              done();
            });
        });

        it('it finds the user we created', function () {
          userWithPasswordReseted._id.should.eql(user._id);
        });

        it('and the user have new password', function () {
          userWithPasswordReseted.verifyPassword('lalala1').should.be.false;
          userWithPasswordReseted.verifyPassword('lalala2').should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndResetPassword for bad api key', function () {
        var user, userNotFound, errorThrown;
        before(function (done) {
          kabam.model.User.create({
            'username': 'iForgotMyPassWordIamStupid',
            'email': 'iForgotMyPassWordIamStupid@teksi.ru',
            'apiKey': 'iForgotMyPassWordIamStupid1111',
            'emailVerified': true,
            'apiKeyCreatedAt': new Date()
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            kabam.model.User.findOneByApiKeyAndResetPassword('thisIsNotCorrectApiKey', 'lalala2', function (err1, userChanged) {
              errorThrown = err1;
              userNotFound = userChanged
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do not returns user in callback', function () {
          should.not.exists(userNotFound);
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('findOneByApiKeyAndResetPassword for outdated api key', function () {
        var user, userNotFound, errorThrown;
        before(function (done) {
          kabam.model.User.create({
            'username': 'iForgotMyPassWordIamStupid',
            'email': 'iForgotMyPassWordIamStupid@teksi.ru',
            'apiKey': 'iForgotMyPassWordIamStupid1111',
            'emailVerified': true,
            'apiKeyCreatedAt': new Date(1986, 1, 12, 11, 45, 36, 21)
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            kabam.model.User.findOneByApiKeyAndResetPassword('iForgotMyPassWordIamStupid1111', 'lalala2', function (err1, userChanged) {
              errorThrown = err1;
              userNotFound = userChanged
              done();
            });
          });
        });

        it('throws proper error', function () {
          errorThrown.should.be.an.instanceOf(Error);
          errorThrown.message.should.be.equal('Activation key is wrong or outdated!');
        });

        it('do not returns user in callback', function () {
          should.not.exists(userNotFound);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('processOAuthProfile for user in database', function () {
        var user, userFound;
        before(function (done) {
          kabam.model.User.signUp('johnDoe', 'johndoe@example.org', 'suzan123', function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            kabam.model.User.processOAuthProfile('johndoe@example.org', function (error, userFromProfile) {
              if (error) {
                throw error;
              }
              userFound = userFromProfile;
              done();
            });

          });
        });

        it('finds exactly the user we need', function () {
          user._id.should.eql(userFound._id);
        });

        it('user is not verified as we need it', function () {
          user.emailVerified.should.be.false;
        });

        it('user have complete profile as we need it', function () {
          user.profileComplete.should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('processOAuthProfile for user NOT in database', function () {
        var user;
        before(function (done) {
          kabam.model.User.processOAuthProfile('johndoe@mail.ru', function (error, userFromProfile) {
            if (error) {
              throw error;
            }
            user = userFromProfile;
            done();
          });
        });

        it('creates a uncompleted profile for this user', function () {
          user.email.should.be.equal('johndoe@mail.ru');
          user.emailVerified.should.be.true;
          user.profileComplete.should.be.false;
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('keychain', function () {

        describe('findByKeychain', function () {
          var user, userFound;

          before(function (done) {
            kabam.model.User.create({
              'username': 'test888',
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              kabam.model.User.findOneByKeychain('github', 11111, function (err, usr) {
                userFound = usr;
                done();
              });
            });
          });

          it('finds correct user', function () {
            userFound._id.should.eql(user._id);
          });

          after(function (done) {
            user.remove(done);
          });
        });

        describe('setKeyChain', function () {
          var user, userUpdated;

          before(function (done) {
            kabam.model.User.create({
              'username': 'test888',
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              user.setKeyChain('someProvider', 1, function (err2) {
                if (err2) {
                  throw err2;
                }
                kabam.model.User.findOneByKeychain('someProvider', 1, function (err, usr) {
                  userUpdated = usr;
                  done();
                });
              });
            });

            it('finds correct user', function () {
              userUpdated._id.should.eql(user._id);
            });

            it('finds correct user', function () {
              userUpdated.keychain.github.should.be.equal(11111);
              userUpdated.keychain.someProvider.should.be.equal(1);
            });


            after(function (done) {
              user.remove(done);
            });
          });
        });

        describe('revokeKeyChain', function () {
          var user, userUpdated;

          before(function (done) {
            kabam.model.User.create({
              'username': 'test888',
              'email': 'ostroumov@teksi.ru',
              'keychain': {
                'github': 11111,
                'someProvider': 1
              }
            }, function (err, userCreated) {
              if (err) {
                throw err;
              }
              user = userCreated;
              user.revokeKeyChain('someProvider', 1, function (err2) {
                if (err2) {
                  throw err2;
                }
                kabam.model.User.findOneByKeychain('github', 11111, function (err, usr) {
                  userUpdated = usr;
                  done();
                });
              });
            });

            it('finds correct user', function () {
              userUpdated._id.should.eql(user._id);
            });

            it('finds correct user', function () {
              userUpdated.keychain.github.should.be.equal(11111);
              should.not.exist(userUpdated.keychain.someProvider);
            });


            after(function (done) {
              user.remove(done);
            });
          });
        });
      });

      describe('kabam_plugin_rest integration for users', function () {
        var user;
        before(function (done) {
          kabam.model.User.create({
            'username': 'test777',
            'email': 'klapajoka@mail.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        describe('kabam.model.User.canCreate for root', function () {
          var val;
          before(function(done){
            kabam.model.User.canCreate({root: true},function(err,v){
              if(err) throw err;
              val = v;
              done();
            });
          });
          it('fires callback(null, true)', function () {
            val.should.be.true;
          });
        });

        describe('kabam.model.User.canCreate for non root', function () {
          var val;
          before(function(done){
            kabam.model.User.canCreate({root: false},function(err,v){
              if(err) throw err;
              val = v;
              done();
            });
          });
          it('fires callback(null, false)', function () {
            val.should.be.false;
          });
        });


        describe('kabam.model.User.canRead for root', function () {
          var val;
          before(function(done){
            user.canRead({root: true},function(err,v){
              if(err) throw err;
              val = v;
              done();
            });
          });
          it('fires callback(null, true)', function () {
            val.should.be.true;
          });
        });

        describe('kabam.model.User.canRead for non root', function () {
          var val;
          before(function(done){
            user.canRead({root: false},function(err,v){
              if(err) throw err;
              val = v;
              done();
            });
          });
          it('fires callback(null, false)', function () {
            val.should.be.false;
          });
        });

        describe('kabam.model.User.canWrite for root', function () {
          var val;
          before(function(done){
            user.canWrite({root: true},function(err,v){
              if(err) throw err;
              val = v;
              done();
            });
          });
          it('fires callback(null, true)', function () {
            val.should.be.true;
          });
        });

        describe('kabam.model.User.canWrite for non root', function () {
          var val;
          before(function(done){
            user.canWrite({root: false},function(err,v){
              if(err) throw err;
              val = v;
              done();
            });
          });
          it('fires callback(null, false)', function () {
            val.should.be.false;
          });
        });

        describe('kabam.model.User.getForUser works for root user', function () {
          var usersFound, usersNotFound = '';
          before(function (done) {
            async.parallel([
              function (cb) {
                kabam.model.User.getForUser({root: true}, {username: 'test777'}, function (err, users) {
                  usersFound = users;
                  cb(err);
                });
              },
              function (cb) {
                kabam.model.User.getForUser({root: true}, {username: 'papytraxaetsobakatakemyinado'}, function (err, users) {
                  usersNotFound = users;
                  cb(err);
                })
              }
            ], done);
          });

          it('finds the user by correct parameters', function () {
            usersFound.should.be.instanceOf(Array);
            usersFound.length.should.be.equal(1);
            usersFound[0].username.should.be.equal('test777');
            usersFound[0].email.should.be.equal('klapajoka@mail.ru');
          });

          it('do not finds the user by wrong parameters', function () {
            usersNotFound.should.be.instanceOf(Array);
            usersNotFound.length.should.be.equal(0);
          });


        });

        describe('kabam.model.User.getForUser fails for non root user', function () {
          var error;
          before(function (done) {
            kabam.model.User.getForUser({root: false}, {username: 'papytraxaetsobakatakemyinado'}, function (err, users) {
              error = err;
              done();
            });
          });

          it('throws error', function () {
            error.should.be.instanceOf(Error);
          });
          it('error have valid message', function () {
            error.message.should.equal('Access denied!');
          });
        });


        after(function (done) {
          user.remove(done);
        });

      });
    });
    describe('Testing kabam_core mongoose model one instance of user:', function () {
      describe('general function are callable', function () {
        var user;

        before(function (done) {
          kabam.model.User.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('user instance have correct values', function () {
          user.username.should.be.equal('test888');
          user.email.should.be.equal('ostroumov@teksi.ru');
          user._id.should.match(/[a-z0-9A-Z]+/);
          user.gravatar.should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=80&d=wavatar&r=g');

          user.profileComplete.should.be.false;
          user.emailVerified.should.be.false;

          user.isBanned.should.be.false;
          user.root.should.be.false;
          user.lang.should.be.equal('en');
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

          user.canRead.should.be.a('function');
          user.canWrite.should.be.a('function');
        });

        it('user instance creates a proper gravatar url', function () {
          user.getGravatar().should.equal('https://secure.gravatar.com/avatar/0713799ed54a48d222f068d538d68a70.jpg?s=300&d=wavatar&r=g');
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('functions setPassword, verifyPassword', function () {
        var user;
        before(function (done) {
          kabam.model.User.create({
            'username': 'testSubject47_1',
            'email': 'ostroumov3@teksi.ru'
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
          user.remove(done);
        });
      });

      describe('function invalidateSession', function () {
        var user, newApiKey;
        before(function (done) {
          kabam.model.User.create({
            'username': 'testSubject47_2',
            'email': 'ostroumov_3@teksi.ru',
            'apiKey': 'lalalaDaiMne3Ryblya'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            userCreated.invalidateSession(function (err2, apiKeySetted) {
              if (err2) {
                throw err2;
              }
              newApiKey = apiKeySetted;
              kabam.model.User.findOne({'username': 'testSubject47_2'}, function (err3, userFound) {
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

        it('fires callback with new api key', function () {
          newApiKey.should.be.equal(user.apiKey);
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('function hasRole', function () {
        var user;
        before(function (done) {
          kabam.model.User.create({
            'username': 'test888',
            'email': 'ostroumov@teksi.ru',
            'roles': 'role1'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            done();
          });
        });

        it('returns true if role assigned', function () {
          user.hasRole('role1').should.be.true;
        });

        it('returns false if role is not assigned', function () {
          user.hasRole('role2').should.be.false;
        });
        after(function (done) {
          user.remove(done);
        });
      });

      describe('function grantRole', function () {
        var userWithRole;
        before(function (done) {
          async.waterfall(
            [
              function (cb) {
                kabam.model.User.create({
                  'username': 'test888',
                  'email': 'ostroumov@teksi.ru'
                }, cb);
              },
              function (aaa, cb) {
                kabam.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  userFound.grantRole('role2', function (err) {
                    cb(err, true);
                  });
                });
              },
              function (granted, cb) {
                kabam.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  cb(err, userFound);
                });
              }
            ], function (err, userFound) {
              userWithRole = userFound;
              if (err) {
                throw err;
              }

              done();
            });
        });

        it('grants assigned role', function () {
          userWithRole.hasRole('role2').should.be.true;
        });

        after(function (done) {
          userWithRole.remove(done);
        });
      });

      describe('function revokeRole', function () {
        var userWithOutRole;
        before(function (done) {
          async.waterfall(
            [
              function (cb) {
                kabam.model.User.create({
                  'username': 'test888',
                  'email': 'ostroumov@teksi.ru',
                  'roles': ['role1', 'role2']
                }, cb);
              },
              function (aaa, cb) {
                kabam.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  userFound.revokeRole('role2', function (err) {
                    cb(err, true);
                  });
                });
              },
              function (granted, cb) {
                kabam.model.User.findOneByLoginOrEmail('test888', function (err, userFound) {
                  cb(err, userFound);
                });
              }
            ], function (err, userFound) {
              userWithOutRole = userFound;
              if (err) {
                throw err;
              }
              done();
            });
        });
        it('revokeRole leaved other roles intact', function () {
          userWithOutRole.hasRole('role1').should.be.true;
        });
        it('revokeRole removed desired role', function () {
          userWithOutRole.hasRole('role2').should.be.false;
        });

        after(function (done) {
          userWithOutRole.remove(done);
        });
      });

      describe('function notify', function () {
        var user,
          messageObj;
        before(function (done) {
          kabam.model.User.create({
            'username': 'test888',
            'email': 'ostroumov' + Math.floor(Math.random() * 100) + '@teksi.ru'
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;

            setTimeout(function () {
              user.notify('Hello!');
            }, 300);

            kabam.on('notify:all', function (message) {
              messageObj = message;
              done();
            });
          });
        });

        it('makes kabam core emit events with message created properly', function () {
          messageObj.user.should.eql(user);
          messageObj.message.should.be.equal('Hello!');
        });

        it('throws errors for empty arguments', function () {
          (function () {
            user.notify();
          }).should.throw('Function User.notify([channelNameString],messageObj) has wrond arguments!');
        });

        after(function (done) {
          user.remove(done);
        });
      });

      describe('completeProfile for uncompleted profile', function () {
        var user, userCompleted;
        before(function (done) {
          kabam.model.User.create({
            'email': 'emptyness@teksi.ru',
            'profileComplete': false,
            'emailVerified': true
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            userCreated.completeProfile('Anatolij', 'thePerpendicularReality', function (err1) {
              if (err1) {
                throw err1;
              }
              kabam.model.User.findOneByLoginOrEmail('Anatolij', function (err2, userFound) {
                if (err2) {
                  throw err2;
                }
                userCompleted = userFound;
                done();
              });
            });
          });
        });

        it('it finds the user we created', function () {
          userCompleted._id.should.eql(user._id);
        });

        it('set profileComplete to TRUE', function () {
          userCompleted.profileComplete.should.be.true;
        });

        it('sets the username properly', function () {
          userCompleted.username.should.be.equal('Anatolij');
        });

        it('sets the password properly', function () {
          userCompleted.verifyPassword('thePerpendicularReality').should.be.true;
        });

        after(function (done) {
          user.remove(done);
        });
      });
      describe('completeProfile for completed profile', function () {
        var user, errorThrown;
        before(function (done) {
          kabam.model.User.create({
            'email': 'emptyness@teksi.ru',
            'profileComplete': true,
            'emailVerified': true
          }, function (err, userCreated) {
            if (err) {
              throw err;
            }
            user = userCreated;
            userCreated.completeProfile('Anatolij', 'thePerpendicularReality', function (err1) {
              errorThrown = err1;
              done();
            });
          });
        });

        it('throws error properly', function () {
          errorThrown.should.be.instanceOf(Error);
          errorThrown.message.should.be.equal('Account is completed!');
        });

        after(function (done) {
          user.remove(done);
        });
      });
    });
  });

  describe('user model have to be compatible with kabam-plugin-test', function () {
    it('it exposes getForUser and canCreate for Active Record', function () {
      kabam.model.User.getForUser.should.be.a('function');
      kabam.model.Users.getForUser.should.be.a('function');
      kabam.model.User.canCreate.should.be.a('function');
      kabam.model.Users.canCreate.should.be.a('function');
    });

    describe('getForUser and canCreate works for root', function () {
      var user, users;
      before(function (done) {
        kabam.model.User.create({
          'username': 'test888',
          'email': 'anybody@teksi.ru',
          'root': true,
          'profileComplete': true,
          'emailVerified': true
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          kabam.model.User.getForUser(user, function (err, usersFound) {
            if (err) throw err;
            users = usersFound;
            done();
          });
        });
      });

      it('getForUser returns list of users', function () {
        users.should.be.an.instanceOf(Array);
        users.length.should.be.above(0);
        users.map(function (userToTest) {
          userToTest.username.should.be.a('string');
          userToTest.email.should.be.a('string');
          userToTest._id.should.match(/[a-z0-9A-Z]+/);
          userToTest.verifyPassword.should.be.a('function');
          userToTest.setPassword.should.be.a('function');
          userToTest.invalidateSession.should.be.a('function');

          userToTest.grantRole.should.be.a('function');
          userToTest.hasRole.should.be.a('function');
          userToTest.revokeRole.should.be.a('function');

          userToTest.notify.should.be.a('function');
          userToTest.getGravatar.should.be.a('function');
          userToTest.completeProfile.should.be.a('function');

          userToTest.canRead.should.be.a('function');
          userToTest.canWrite.should.be.a('function');

        });
      });

      after(function (done) {
        user.remove(done);
      });
    });

  });

  describe('private messages system', function () {
    describe('messages schema have to be compatible with kabam-plugin-rest', function () {
      var user;
      before(function (done) {
        kabam.model.User.create({
          'email': 'anybody@teksi.ru',
          'profileComplete': true,
          'emailVerified': true
        }, function (err, userCreated) {
          if (err) {
            throw err;
          }
          user = userCreated;
          done();
        });
      });

      it('it exposes getForUser and canCreate for Active Record', function () {
        kabam.model.Message.getForUser.should.be.a('function');
        kabam.model.Messages.getForUser.should.be.a('function');
        kabam.model.Message.canCreate.should.be.a('function');
        kabam.model.Messages.canCreate.should.be.a('function');
      });

      describe('canCreate for proper user', function(){
        var val;
        before(function(done){
          kabam.model.Messages.canCreate(user, function(err,v){
            if(err) throw err;
            val = v;
            done();
          });
        });

        it('fires callback with (null, true)',function(){
          val.should.be.true;
        });
      });

      describe('canCreate for user with uncomplete profile', function(){
        var val;
        before(function(done){
          kabam.model.Messages.canCreate({'profileComplete': false}, function(err,v){
            if(err) throw err;
            val = v;
            done();
          });
        });

        it('fires callback with (null,null)',function(){
          should.not.exists(val);
        });
      });

      describe('canCreate for user with unverified profile', function(){
        var val;
        before(function(done){
          kabam.model.Messages.canCreate({'emailVerified': false}, function(err,v){
            if(err) throw err;
            val = v;
            done();
          });
        });

        it('fires callback with (null,null)',function(){
          val.should.be.false;
        });
      });

      describe('canCreate for user with banned profile', function(){
        var val;
        before(function(done){
          kabam.model.Messages.canCreate({'isBanned': true}, function(err, v){
            if(err) throw err;
            val = v;
            done();
          });
        });

        it('fires callback with (null,null)',function(){
          should.not.exists(val);
        });
      });

      after(function (done) {
        user.remove(done);
      });
    });

    describe('messages system actually works', function () {
      var User1, User2;
      before(function (done) {
        async.parallel({
          'user1': function (cb) {
            kabam.model.User.create({
              'username': 'testSpamer1',
              'email': 'testSpamer1@example.org',
              'emailVerified': true,
              'profileComplete': true,
              'isBanned': false
            }, cb);
          },
          'user2': function (cb) {
            kabam.model.User.create({
              'username': 'testSpamer2',
              'email': 'testSpamer2@example.org',
              'emailVerified': true,
              'profileComplete': true,
              'isBanned': false
            }, cb);
          }
        }, function (err, obj) {
          if (err) throw err;
          User1 = obj.user1;
          User2 = obj.user2;
          done();
        });
      });

      describe('creating messages:', function () {
        describe('sendMessage', function () {
          var event;
          before(function (done) {
            kabam.once('notify:pm', function (m) {
              event = m;
              setTimeout(done, 1000);
            });
            User1.sendMessage(User2, 'test1','test1', function (err, messageCreated) {
              if (err) {
                throw err;
              }
            });
          });

          it('event is emitted once when user sends message', function () {
            should.exist(event);
          });

          it('event have correct "from" field', function () {
            event.from._id.should.be.eql(User1._id);
          });

          it('event have correct "user" field', function () {
            event.user._id.should.be.eql(User2._id);
          });

          it('event have proper contents', function () {
            event.message.should.be.equal('test1');
            event.title.should.be.equal('test1');
          });
        });
        describe('recieveMessage', function () {
          var event;
          before(function (done) {
            kabam.once('notify:pm', function (m) {
              event = m;
              setTimeout(done, 1000);
            });
            User2.recieveMessage(User1,'test2', 'test2', function (err, messageCreated) {
              if (err) {
                throw err;
              }
            });
          });

          it('event is emitted once when user sends message', function () {
            should.exist(event);
          });

          it('event have correct "from" field', function () {
            event.from._id.should.be.eql(User1
              ._id);
          });

          it('event have correct "user" field', function () {
            event.user._id.should.be.eql(User2._id);
          });

          it('event have proper contents', function () {
            event.message.should.be.equal('test2');
            event.title.should.be.equal('test2');
          });
        });
      });

      describe('reading messages:', function () {
        describe('getRecentMessages', function () {
          var recentMessages, errF;
          before(function (done) {
            User2.getRecentMessages(100, 0, function (err, messages) {
              errF = err;
              recentMessages = messages;
              done();
            });
          });

          it('fires callback without error', function () {
            should.not.exist(errF);
          });

          it('fires callback with recent messages', function () {
            recentMessages.should.be.instanceOf(Array);
            recentMessages.length.should.be.equal(2);

            recentMessages[0].message.should.be.equal('test2');
            recentMessages[0].title.should.be.equal('test2');
            recentMessages[0].to.should.be.eql(User2._id);
            recentMessages[0].from.should.be.eql(User1._id);

            recentMessages[1].message.should.be.equal('test1');
            recentMessages[1].title.should.be.equal('test1');
            recentMessages[1].to.should.be.eql(User2._id);
            recentMessages[1].from.should.be.eql(User1._id);

          });
        });

        describe('getDialog for string of login', function () {
          var recentMessages, errF;
          before(function (done) {
            User2.getDialog('testSpamer1', 100, 0, function (err, messages) {
              errF = err;
              recentMessages = messages;
              done();
            });
          });

          it('fires callback without error', function () {
            should.not.exist(errF);
          });

          it('fires callback with recent messages', function () {
            recentMessages.should.be.instanceOf(Array);
            recentMessages.length.should.be.equal(2);

            recentMessages[0].message.should.be.equal('test2');
            recentMessages[0].title.should.be.equal('test2');
            recentMessages[0].to.should.be.eql(User2._id);
            recentMessages[0].from.should.be.eql(User1._id);

            recentMessages[1].message.should.be.equal('test1');
            recentMessages[1].title.should.be.equal('test1');
            recentMessages[1].to.should.be.eql(User2._id);
            recentMessages[1].from.should.be.eql(User1._id);

          });
        });

        describe('getDialog for string of email', function () {
          var recentMessages, errF;
          before(function (done) {
            User2.getDialog('testSpamer1@example.org', 100, 0, function (err, messages) {
              errF = err;
              recentMessages = messages;
              done();
            });
          });

          it('fires callback without error', function () {
            should.not.exist(errF);
          });

          it('fires callback with recent messages', function () {
            recentMessages.should.be.instanceOf(Array);
            recentMessages.length.should.be.equal(2);

            recentMessages[0].message.should.be.equal('test2');
            recentMessages[0].title.should.be.equal('test2');
            recentMessages[0].to.should.be.eql(User2._id);
            recentMessages[0].from.should.be.eql(User1._id);

            recentMessages[1].message.should.be.equal('test1');
            recentMessages[1].title.should.be.equal('test1');
            recentMessages[1].to.should.be.eql(User2._id);
            recentMessages[1].from.should.be.eql(User1._id);

          });
        });

        describe('getDialog for user object', function () {
          var recentMessages, errF;
          before(function (done) {
            User2.getDialog(User1, 100, 0, function (err, messages) {
              errF = err;
              recentMessages = messages;
              done();
            });
          });

          it('fires callback without error', function () {
            should.not.exist(errF);
          });

          it('fires callback with recent messages', function () {
            recentMessages.should.be.instanceOf(Array);
            recentMessages.length.should.be.equal(2);

            recentMessages[0].message.should.be.equal('test2');
            recentMessages[0].title.should.be.equal('test2');
            recentMessages[0].to.should.be.eql(User2._id);
            recentMessages[0].from.should.be.eql(User1._id);

            recentMessages[1].message.should.be.equal('test1');
            recentMessages[1].title.should.be.equal('test1');
            recentMessages[1].to.should.be.eql(User2._id);
            recentMessages[1].from.should.be.eql(User1._id);

          });
        });
      });

      after(function (done) {
        async.parallel([
          function (cb) {
            User1.remove(cb);
          },
          function (cb) {
            User2.remove(cb);
          },
          function (cb) {
            kabam.model.Message.remove({'from': User1._id}, cb);
          }
        ], done);
      });
    });
  });

  after(function (done) {
    kabam.stop();
    done();
  });
});
