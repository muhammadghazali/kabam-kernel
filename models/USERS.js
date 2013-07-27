var async = require('async'),
  hat = require('hat'),
  rack = hat.rack(),
  crypto = require('crypto'),
  moment = require('moment'),
  mongooseTypes = require('mongoose-types'); //https://github.com/bnoguchi/mongoose-types
//useTimestamps = mongooseTypes.useTimestamps;


function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}

module.exports = exports = function (mongoose, config) {
  mongooseTypes.loadTypes(mongoose);
  var Email = mongoose.SchemaTypes.Email;

  var Schema = mongoose.Schema;

  //end of group schema


  var UserSchema = new Schema({
    email: {type: Email, required: true, unique: true},
    username: {type: String, required: true, unique: true, match: /^[a-zA-Z0-9_]+$/ },
    salt: String,
    password: String,

    roles: [{type: String, match: /^[a-zA-Z0-9_]+$/ }],

    apiKey: {type: String, required: false, unique: true, match: /^[a-zA-Z0-9_]*$/ }, //for invalidating sessions by user request, for api interactions...

    active: Boolean,
    root: Boolean,

    activeDate: Date,
    confirmation: {
      string: String,
      date: Date
    }
  });
  //UserSchema.plugin(useTimestamps);//do not works! add createdAt, and updatedAt attributes

  UserSchema.index({
    email: 1,
    username: 1,
    apiKey: 1,
    roles: 1
  });
//*/todo - re do!
  UserSchema.methods.generateConfirmationLink = function (callback) {
    this.confirmation.string = rack();
    this.confirmation.date = new Date();
    this.save(callback);
    return;
  };
  UserSchema.methods.activateUser = function (confirmationString, callback) {
    var err;
    if (typeof confirmationString !== 'undefined') {
      if (confirmationString !== this.confirmation.string) {
        err = new Error('Confirmation Strings don\'t match');
        callback(err);
      }
      var originalDate = moment(this.confirmation.date),
        now = moment(),
        expired = (typeof config.confirmationLinkExpireHours === 'undefined') ? 1 :
          config.confirmationLinkExpireHours;

      if (now.isAfter(originalDate.add('hours', expired))) {
        err = new Error('The link has expired.');
        callback(err);
      }
    }
    this.confirmation = null;
    this.activeDate = new Date();
    this.active = true;
    this.save(callback);
    return;
  };
//*/


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
    this.apiKey = rack();
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
    return (this.roles.indexOf(roleName) !== -1);
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

  return mongoose.model('users', UserSchema);
};