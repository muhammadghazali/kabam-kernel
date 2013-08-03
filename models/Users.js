var async = require('async'),
  hat = require('hat'),
  rack = hat.rack(),
  crypto = require('crypto');

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}

module.exports = exports = function (mwc) {
  var mongoose = mwc.mongoose;

  var Schema = mongoose.Schema;

  var UserSchema = new Schema({
    email: {type: String, required: true, unique: true, match: /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/},

    username: {type: String, unique: true, match: /^[a-zA-Z0-9_]+$/, sparse: true},
    //sparse - it means it be unique, if not null  http://stackoverflow.com/questions/7955040/mongodb-mongoose-unique-if-not-null
    salt: String,//string to hash password
    password: String,//hashed password

    //api key interaction
    apiKey: {type: String, required: true, unique: true, match: /^[a-zA-Z0-9_]+$/ }, //for invalidating sessions by user request, for api interactions...
    apiKeyCreatedAt: Date,


    //role management
    root: Boolean,
    roles: [{type: String, match: /^[a-zA-Z0-9_]+$/ }],

    //profile status
    emailVerified: Boolean, //profile is activated
    profileComplete:Boolean, //profile is complete - it means, it have email, username and password set!

    profile: Object //this is user profile object. it can store anything! - age, postal address, occupation. everything! todo - embedded document?
  });
  //UserSchema.plugin(useTimestamps);//do not works! add createdAt, and updatedAt attributes

  UserSchema.index({
    email: 1,
    username: 1,
    apiKey: 1,
    roles: 1
  });


  UserSchema.methods.getGravatar = function (s, d, r) {
    //https://ru.gravatar.com/site/implement/images/
    //s - image size
    //d - 404,mm,identicon,monsterid,wavatar,retro,blank - style
    //r - g,pg,r,x - rating
    if (!s) {
      s = 300;
    }
    if (!d) {
      d = 'wavatar';
    }
    if (!r) {
      r = 'g';
    }
    return 'https://secure.gravatar.com/avatar/' + md5(this.email.toLowerCase().trim()) + '.jpg?s=' + s + '&d=' + d + '&r=' + r;
  };

  UserSchema.methods.verifyPassword = function (password) {
    return (sha512('' + this.salt + password) === this.password);
  };

  UserSchema.methods.setPassword = function (newPassword, callback) {
    var salt = sha512(rack());
    this.salt = salt;
    this.password = sha512('' + salt + newPassword);
    this.save(callback);
    return;
  };

  UserSchema.methods.invalidateSession = function (callback) {
    this.apiKey = sha512(rack());
    this.save(callback);
    return;
  };

  //role managmenet
  UserSchema.methods.grantRole = function (roleName, callback) {
    if (this.roles.indexOf(roleName) === -1) {
      this.roles.push(roleName);
      this.save(callback);
    } else {
      callback(new Error('User "' + this.username + '" already have role of "' + roleName + '"'));
    }
  };
  UserSchema.methods.hasRole = function (roleName) {
    if(this.root){
      return true;
    } else {
      return (this.roles.indexOf(roleName) !== -1);
    }
  };
  UserSchema.methods.revokeRole = function (roleName, callback) {
    var roleIndex = this.roles.indexOf(roleName);
    if (roleIndex === -1) {
      callback(new Error('User "' + this.username + '" do not have role of "' + roleName + '"'));
    } else {
      this.roles.splice(roleIndex, 1);
      this.save(callback);
    }
  };

  //notify
  UserSchema.methods.notify=function(message){
    if(typeof message === 'string'){
      mwc.emit('notify',{
        'user':this,
        'type':'text',
        'message':message
      });
    } else {
      mwc.emit('notify',{
        'user':this,
        'type': (message.type)?(message.type):'text',
        'message':message
      });
    }
  };

  //finders
  UserSchema.statics.findOneByLoginOrEmail = function (loginOrEmail, callback) {
    if (/^[a-zA-Z0-9_]+$/.test(loginOrEmail)) {
      this.findOne({'username': loginOrEmail}, callback);
    } else {
      this.findOne({'email': loginOrEmail}, callback);
    }
  };

  UserSchema.statics.findOneByApiKey = function (apiKey, callback) {
    this.findOne({'apiKey': apiKey}, callback);
  };

  UserSchema.statics.getByRole = function (role, callback) {
    this.find({'roles': [role]}, callback);
  };

  //signup new user by username, email, password,
  UserSchema.statics.signUp = function(username,email,password,callback){
    this.create({
      'username':username,
      'email':email,
      'apiKey':sha512(rack()),
      'emailVerified':false,
      'root':false,
      'profileComplete':true,
      'apiKeyCreatedAt':new Date()
    },function(err,userCreated){
      if(err) {
        callback(err);
      } else {
        userCreated.setPassword(password,function(err1){
          if(err1){
            callback(err1);
          } else {
            callback(null,userCreated);
          }
        });
      }
    });
  };

  //signup new user by email only - for example, when he sign in by google, facebook and other oauth providers
  //account is set as uncompleted!
  UserSchema.statics.signUpByEmailOnly = function (email, callback) {
    this.create({
      'email': email,
      'emailVerified': true, //email is verified!
      'profileComplete': false,
      'apiKey': sha512(rack()),
      'root':false,
      'apiKeyCreatedAt':new Date()
    }, function (err, userCreated) {
      if (err) {
        callback(err);
      } else {
        userCreated.setPassword(rack(), function (err1) {//because leaving user without password is stupid
          if (err1) {
            callback(err1);
          } else {
            callback(null, userCreated);
          }
        });
      }
    });
  };
  //complete account
  UserSchema.methods.completeProfile = function(username,password,callback){
    if(typeof this.username === 'undefined' && this.profileComplete === false){
      this.username = username;
      this.profileComplete = true;
      this.setPassword(password,callback);
    } else {
      callback(new Error('Account is completed!'));
    }
  };


  UserSchema.statics.findOneByApiKeyAndVerify = function(apiKey,callback){
    this.findOneByApiKey(apiKey,function(err,userFound){
      if(err){
        callback(err);
      } else {
        if(userFound && userFound.emailVerified === false && (new Date().getTime() - userFound.apiKeyCreatedAt.getTime())<30*60*1000) {
          userFound.emailVerified = true;
          userFound.save(function(err1){
            callback(err1,userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };

  UserSchema.statics.findOneByApiKeyAndResetPassword = function(apiKey, password, callback){
    this.findOneByApiKey(apiKey,function(err,userFound){
      if(err) {
        callback(err);
      } else {
        if(userFound && (new Date().getTime() - userFound.apiKeyCreatedAt.getTime())<30*60*1000){
          userFound.setPassword(password,function(err1){
            callback(err1,userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };

  return mongoose.model('users', UserSchema);
};
