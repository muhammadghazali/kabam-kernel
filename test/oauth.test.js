/*jshint curly:false, expr: true */
var
  should = require('should'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  kabam, User;


describe('User model OAuth methods', function(){
  before(function(done){
    var config = {MONGO_URL: 'mongodb://localhost/kabam_test'};
    var connection = mongoose.createConnection(config.MONGO_URL);
    // We should first connect manually to the database and delete it because if we would use kabam.mongoConnection
    // then models would not recreate their indexes because mongoose would initialise before we would drop database.
    kabam = kabamKernel(config);
    connection.on('open', function(){
      connection.db.dropDatabase(function(){
        kabam.on('started', function(){
          User = kabam.model.User;
          done();
        });
        kabam.start('app');
      });
    });
  });

  describe('#signUpWithService', function(){
    afterEach(function(done){
      User.remove(function(err){
        done(err);
      });
    });
    it('should create a new user with the given email and save service profile to the keychain', function(done){
      User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err, user){
        if (err) return done(err);
        should.ok(typeof user === 'object');
        user.should.have.property('email', 'john@doe.com');
        user.should.have.property('keychain');
        user.keychain.should.have.property('github', 1);
        done();
      });
    });
    it('should return error if user exist', function(done){
      User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err){
        if (err) return done(err);
        User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err/*, user*/){
          should.exist(err);
          kabam.model.User.find(function(err, users){
            should(users.length === 1);
            done();
          });
        });
      });
    });
    it('should create a new user without email just by saving proper keychain', function(done){
      User.signUpWithService(null, {id: 1, provider: 'github'}, function(err, user){
        if (err) return done(err);
        should.ok(typeof user === 'object');
        user.should.not.have.property('email');
        user.should.have.property('emailVerified', false);
        user.should.have.property('keychain');
        user.keychain.should.have.property('github', 1);
        done();
      });
    });
    it('should save last and first name if profile has them property', function(done){
      var profile = {id: 1, provider: 'github', firstName: 'John', lastName: 'Malkovich'};
      User.signUpWithService(null, profile, function(err, user){
        if (err) return done(err);
        should.ok(typeof user === 'object');
        user.should.have.property('firstName', 'John');
        user.should.have.property('lastName', 'Malkovich');
        done();
      });
    });
  });

  describe('#linkWithService', function(){
    afterEach(function(done){
      User.remove(function(err){
        done(err);
      });
    });

    describe('if user is not provided', function(){
      describe('if can create', function(){
        it('should create a new user if account wasn\'t linked before', function(done){
          var profile = {id: 1, provider: 'github', emails: [
            {value: 'john@doe.com'}
          ]};
          User.linkWithService(null, profile, true, function(err, user, created){
            if (err) return done(err);
            /* jshint expr: true *///noinspection BadExpressionStatementJS
            created.should.be.true;
            user.should.have.property('email', 'john@doe.com');
            user.should.have.property('emailVerified', true);
            user.should.have.property('keychain');
            user.keychain.should.have.property('github', 1);
            done();
          });
        });
        it('should create a new user with empty email if account wasn\'t linked before and has no email', function(done){
          var profile = {id: 1, provider: 'github'};
          User.linkWithService(null, profile, true, function(err, user, created){
            if (err) return done(err);
            /* jshint expr: true *///noinspection BadExpressionStatementJS
            created.should.be.true;
            user.should.not.have.property('email');
            user.should.have.property('emailVerified', false);
            user.should.have.property('keychain');
            user.keychain.should.have.property('github', 1);
            done();
          });
        });
        it('should not create a new or update the existing user if there is someone with same email', function(done){
          User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err/*, user*/){
            if (err) return done(err);
            var profile = {id: 1, provider: 'google', emails: [
              {value: 'john@doe.com'}
            ]};
            User.linkWithService(null, profile, true, function(err, user, info){
              if (err) done(err);
              //noinspection BadExpressionStatementJS
              user.should.be.false;
              info.should.have.property('message');
              should(info.message.indexOf('john@doe.com') !== -1);
              done();
            });
          });
        });
      });
      it('should login already linked user if profile has an email', function(done){
        User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err/*, user*/){
          if (err) return done(err);
          var profile = {id: 1, provider: 'github', emails: [
            {value: 'john@doe.com'}
          ]};
          User.linkWithService(null, profile, false, function(err, user, created){
            if (err) done(err);
            /* jshint expr: true *///noinspection BadExpressionStatementJS
            created.should.be.false;
            user.should.have.property('email');
            user.should.have.property('emailVerified', true);
            user.should.have.property('keychain');
            user.keychain.should.have.property('github', 1);
            done();
          });
        });
      });
      it('should login already linked user if profile don\'t has an email', function(done){
        User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err/*, user*/){
          if (err) return done(err);
          var profile = {id: 1, provider: 'github'};
          User.linkWithService(null, profile, false, function(err, user, created){
            if (err) done(err);
            //noinspection BadExpressionStatementJS
            created.should.be.false;
            user.should.have.property('email');
            user.should.have.property('emailVerified', true);
            user.should.have.property('keychain');
            user.keychain.should.have.property('github', 1);
            done();
          });
        });
      });
      it('should not create a new user if canCreate is false', function(done){
        var profile = {id: 1, provider: 'github', emails: [
          {value: 'john@doe.com'}
        ]};
        User.linkWithService(null, profile, false, function(err, user, info){
          if (err) return done(err);
          //noinspection BadExpressionStatementJS
          user.should.be.false;
          info.should.have.property('message');
          should(info.message.indexOf('Cannot login using Github') !== -1);
          done();
        });
      });
    });

    describe('if user provided', function(){
      it('should login login user if they have same keychain', function(done){
        User.signUpWithService('john@doe.com', {id: 1, provider: 'github'}, function(err, user){
          if (err) return  done(err);
          var profile = {id: 1, provider: 'github', emails: [
            {value: 'john@doe.com'}
          ]};
          User.linkWithService(user, profile, false, function(err, user, created){
            if (err) return done(err);
            should.exist(user);
            created.should.have.type('boolean');
            //noinspection BadExpressionStatementJS
            created.should.not.be.true;
            done();
          });
        });
      });
      it('should link accounts if user doesn\'t have the same keychain', function(done){
        User.signUpWithService('john@doe.com', {id: 123, provider: 'github'}, function(err, user){
          if (err) return  done(err);
          var profile = {id: 1, provider: 'facebook', emails: [
            {value: 'mark@facebook.com'}
          ]};
          User.linkWithService(user, profile, false, function(err, user, created){
            if (err) return done(err);
            should.exist(user);
            /* jshint expr: true *///noinspection BadExpressionStatementJS
            created.should.not.be.true;
            user.should.have.property('keychain');
            user.keychain.should.have.property('github', 123);
            user.keychain.should.have.property('facebook', 1);
            done();
          });
        });
      });
      it('should not change user\'s email', function(done){
        User.signUpWithService('john@doe.com', {id: 123, provider: 'github'}, function(err, user){
          if (err) return  done(err);
          var profile = {id: 1, provider: 'facebook', emails: [
            {value: 'mark@facebook.com'}
          ]};
          User.linkWithService(user, profile, false, function(err, user, created){
            if (err) return done(err);
            should.exist(user);
            //noinspection BadExpressionStatementJS
            created.should.not.be.true;
            user.should.have.property('email', 'john@doe.com');
            done();
          });
        });
      });
      it('should throw error if there is a user with the same keychain', function(done){
        User.signUpWithService('john@doe.com', {id: 123, provider: 'github'}, function(err/*, user*/){
          if (err) return  done(err);
          User.signUpWithService('john@malkovich.com', {id: 321, provider: 'facebook'}, function(err, user){
            if (err) return  done(err);
            // trying to lik to the second user the same keychain as for the first user
            User.linkWithService(user, {id: 123, provider: 'github'}, false, function(err, user, info){
              if (err) return done(err);
              should.exist(user);
              info.should.have.type('object');
              info.should.have.property('message');
              should(info.message.indexOf('Someone already linked this Github account') !== -1);
              done();
            });
          });
        });
      });
    });
  });

});