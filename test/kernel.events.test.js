var should = require('should'),
  async = require('async'),
  mwcKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request'),
  port = Math.floor(2000+1000*Math.random());

describe('Kernel eventsemitter testing', function() {

    var MWC;
    before(function(done) {
        MWC = mwcKernel(config);

        MWC.start(port);
        setTimeout(done, 1000);
    });


    describe('Testing users:signUp', function() {
        var user;
        before(function(done) {
            MWC.model.User.signUp('ff', 'ff@example.org', 'waterfall', function(err, userCreated) {
                if(err) {
                    throw err;
                }
            });
            MWC.on('users:signUp', function(u) {
                user = u;
                done();
            });
        });
        it('signUp with desired username', function() {
            user.username.should.be.equal('ff');
        });

        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:signUpByEmailOnly event', function() {
        var user;
        before(function(done) {
            MWC.model.User.signUpByEmailOnly('johndoea@example.org', function (err, userCreated) {
                if (err) {
                  throw err;
                }                              
              });

            MWC.on('users:signUpByEmailOnly', function(u) {
                user = u;
                done();
            });
        });
        it('signUp with desired username', function() {
            should.not.exist(user.username);
        });

        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:completeProfile event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hggg@dddf.sg',
                'profileComplete': false,
                'emailVerified': true
              }, function (err, userCreated) {
                if (err) {
                  throw err;
                }
                 
                userCreated.completeProfile('hrrt', 'abcd12', function (err1){
                    if (err1) {
                        throw err1;
                      }
                });                          
              });

            MWC.on('users:completeProfile', function(u) {
                user = u;
                done();
            });
        });
        it('completeProfile test username', function() {
           user.username.should.be.equal('hrrt');
        });

        after(function(done) {
            user.remove(done);
        });
    });

    /*describe('Testing users:saveProfile event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hggg@dddf.sg',
                'profileComplete': false,
                'emailVerified': true
              }, function (err, userCreated) {
                if (err) {
                  throw err;
                }
                 
                userCreated.completeProfile('hrrt', 'abcd12', function (err1){
                    if (err1) {
                        throw err1;
                      }
                });                          
              });

            MWC.on('users:completeProfile', function(u) {
                user = u;
                done();
            });
        });
        it('completeProfile test username', function() {
           user.username.should.be.equal('hrrt');
        });

        after(function(done) {
            user.remove(done);
        });
    });*/
    /*describe('Testing users:revokeRole', function() {
        var role;
        var user;
        before(function(done) {
            MWC.model.User.create({ 'email': 'qqa@rambler.ru' }, function(err, userCreated) {
                if(err) {
                    throw err;
                }
                user = userCreated;
                user.revokeRole('role1', function(err) {
                    if(err) {
                        throw err;
                    }
                });
            });
            MWC.on('users:revokeRole', function(r) {
                role = r;
                console.log('+++++++++++++++++++++++++++++++++++++++++++++++++');
                done();
            });
        });
        it('revokeRole with desired role', function() {
            role.should.be.equal('role1');
        });

        after(function(done) {
            user.remove(done);
        });
    });*/
});

