var should = require('should'),  
  mwcKernel = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,  
  port = Math.floor(2000+1000*Math.random());

describe('Kernel events emitter testing', function() {

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
        it('signUp with desired email', function () {
          user.email.should.be.equal('ff@example.org');
        });
        it('check emailVerified', function () {
          user.emailVerified.should.be.false;
        });
        it('check profilecomplete', function () {
          user.profileComplete.should.be.true;
        });
        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:signUpByEmailOnly event', function() {
        var user;
        before(function(done) {
            MWC.model.User.signUpByEmailOnly('abde@gmail.com', function(err, userCreated) {
                if(err) {
                    throw err;
                }
            });

            MWC.on('users:signUpByEmailOnly', function(u) {
                user = u;                
                done();
            });
        });
        it('signUp with desired email', function () {
          user.email.should.be.equal('abde@gmail.com');
        });
        it('signUp with desired username', function() {
            should.not.exist(user.username);
        });
        it('check emailVerified', function () {
          user.emailVerified.should.be.true;
        });
        it('check profilecomplete', function () {
          user.profileComplete.should.be.false;
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
                'profileComplete': false                
            }, function(err, userCreated) {
                if(err) {
                    throw err;
                }

                userCreated.completeProfile('hrrt', 'abcd12', function(err1) {
                    if(err1) {
                        throw err1;
                    }
                });
            });

            MWC.on('users:completeProfile', function(u) {
                user = u;                
                done();
            });
        });
        it('check email', function() {
            user.email.should.be.equal('hggg@dddf.sg');
        });
        it('completeProfile test username', function() {
            user.username.should.be.equal('hrrt');
        });
        it('check profilecomplete', function () {
          user.profileComplete.should.be.true;
        });
        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:saveProfile event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hzy1@dddf.sg',
                'username': 'hzy1'
            }, function(err, userCreated) {
                if(err) {
                    throw err;
                }

                userCreated.saveProfile({
                    'firstName': 'hhh',
                    'lastName': 'zy',
                    'age': 32,
                    'sex': 'm'
                }, function(err) {
                    if(err) {
                        throw error;
                    }
                });

            });

            MWC.on('users:saveProfile', function(u) {
                user = u;                
                done();
            });
        });
        it('check profile', function() {
            user.profile.firstName.should.be.equal('hhh');
            user.profile.lastName.should.be.equal('zy');
            user.profile.age.should.be.equal(32);
            user.profile.sex.should.be.equal('m');
        });

        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:revokeRole event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hzy3@dddf.sg',
                'username': 'hzy3',
                'roles': ['role1', 'role2']
            }, function(err, userCreated) {
                if(err) {
                    throw err;
                }

                userCreated.revokeRole('role1', function(err) {
                    if(err) {
                        throw err;
                    }
                });

            });

            MWC.on('users:revokeRole', function(u) {
                user = u;
                done();
            });
        });
        it('saveProfile test event', function() {
            user.roles.should.have.lengthOf(1);
        });

        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:setKeyChain event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hzy5@dddf.sg'
            }, function(err, userCreated) {
                if(err) {
                    throw err;
                }

                MWC.model.User.findOneByLoginOrEmail('hzy5@dddf.sg', function(err, userFound) {
                    if(err) {
                        throw err;
                    }
                    userFound.setKeyChain('paradise', 'with_Iuda', function(err) {
                        if(err) {
                            throw err;
                        }
                    });
                });

            });



            MWC.on('users:setKeyChain', function(u) {
                user = u;
                done();
            });
        });
        it('setKeyChain test event', function() {
            user.keychain.should.have.property('paradise', 'with_Iuda');
        });

        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:revokeKeyChain event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hzy6@dddf.sg',
                'keychain': {
                    'github': 11111,
                    'foursquare': 222
                }
            }, function(err, userCreated) {
                if(err) {
                    throw err;
                }
                userCreated.revokeKeyChain('github',11111, function(err2) {
                    if(err2) {
                        throw err2;
                    }
                });
            });



            MWC.on('users:revokeKeyChain', function(u) {
                user = u;
                //console.log(u);
                done();
            });
        });
        it('revokeKeyChain test event', function() {
            user.keychain.should.not.have.property('github', 'with_Iuda');
        });

        after(function(done) {
            user.remove(done);
        });
    });

    describe('Testing users:findOneByApiKeyAndVerify event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hzy15@dddf.sg',
                'apiKey': 'vseBydetHoroshooneByApiKey4',
                'emailVerified': false,
                'apiKeyCreatedAt': new Date()
                }
              , function(err, userCreated) {
                    if(err) {
                        throw err;
                    }
                    
                    MWC.model.User.findOneByApiKeyAndVerify('vseBydetHoroshooneByApiKey4', function (err, userActivated) {
                      if(err) {
                            throw err;
                        }
                    });
            });



            MWC.on('users:findOneByApiKeyAndVerify', function(u) {
                user = u;
                //console.log(u);
                done();
            });
        });
        it('findOneByApiKeyAndVerify test event', function() {            
            user.apiKey.should.be.equal('vseBydetHoroshooneByApiKey4');
        });

        after(function(done) {
            user.remove(done);
        });
    });

    /*describe('Testing http event', function() {
               
        before(function(done) {
           
            MWC.on('http', function(params) {                
                console.log(params);
                done();
            });
        });
        it('check http parameters', function() {
            //isStarted.should.be.true;
        });
    });*/

    /*describe('Testing started event', function() {
        
        var isStarted = false;
        before(function(done) {
           
            MWC.on('started', function(obj) {
                isStarted = true;
                console.log('++++++++++++++++++++++++');
                done();
            });
        });
        it('start event', function() {
            isStarted.should.be.true;
        });
    });*/

    /*describe('Testing users:ban event', function() {
        var user;
        before(function(done) {
            MWC.model.User.create({
                'email': 'hzy21@dddf.sg'                
                }
              , function(err, userCreated) {
                    if(err) {
                        throw err;
                    }
                    
                    userCreated.ban(function (err) {
                      if(err) {
                            throw err;
                        }
                    });
            });



            MWC.on('users:ban', function(u) {
                user = u;
                console.log(u);
                done();
            });
        });
        it('ban test event', function() {            
            user.isBanned.should.be.true;
        });

        after(function(done) {
            user.remove(done);
        });
    });*/

});

