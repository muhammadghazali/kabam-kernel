var
  should = require('should'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  kabam, User;


describe('User model OAuth methods', function(){
  before(function(done){
    var
      config = {MONGO_URL:"mongodb://localhost/kabam_test"},
      connection = mongoose.createConnection(config.MONGO_URL);
    // We should first connect manually to the database and delete it because if we would use kabam.mongoConnection
    // then models would not recreate their indexes because mongoose would initialise before we would drop database.
    kabam = kabamKernel(config);
    connection.on('open', function(){
      connection.db.dropDatabase(function () {
        kabam.on('started', function () {
          User = kabam.model.User;
          done();
        });
        kabam.start('app');
      });
    });
  });

  describe('#signUpWithService', function(){
    var user;
    after(function (done) {
      user.remove(done);
    });
    it('should create a new user with the given email and save service profile to the keychain', function(done){
      kabam.model.User.signUpWithService('john@doe.com', {id:1, provider: 'github'}, function(err, _user){
        if(err) done(err);
        user = _user;
        should.ok(typeof user === 'object');
        user.should.have.property('keychain');
        user.keychain.should.have.property('github', 1);
        done();
      })
    });
    it('should return error if user exist', function(done){
      kabam.model.User.signUpWithService('john@doe.com', {id:1, provider: 'github'}, function(err, _user){
        should.exist(err);
        kabam.model.User.find(function(err, users){
          should(users.length == 1);
          done();
        })
      })
    })
  });

  describe('#linkWithService', function(){
    afterEach(function(done){
      User.remove(function(err){
        done(err);
      });
    });
    describe('if email is not provided', function(){
      it("should create a new user if account wasn't linked before", function(done){
        var profile = {id:1, provider:'github', emails:[{value: 'john@doe.com'}]};
        User.linkWithService(null, profile, function(err, user, created){
          if(err) done(err);
          //noinspection BadExpressionStatementJS
          created.should.be.true;
          user.should.have.property('email', 'john@doe.com');
          user.should.have.property('keychain');
          user.keychain.should.have.property('github', 1);
          done();
        });
      });
      it("should create a new user with empty email if account wasn't linked before and has no email", function(done){
        var profile = {id:1, provider:'github'};
        User.linkWithService(null, profile, function(err, user, created){
          if(err) done(err);
          //noinspection BadExpressionStatementJS
          created.should.be.true;
          user.should.not.have.property('email');
          user.should.have.property('emailVerified', false);
          user.should.have.property('keychain');
          user.keychain.should.have.property('github', 1);
          done();
        })
      });
    });
  });

});