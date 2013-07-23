var async = require('async'),
  hat = require('hat'),
  rack = hat.rack(),
  crypto = require('crypto'),
  moment = require('moment'),
  async = require('async'),

//https://github.com/bnoguchi/mongoose-types
  mongooseTypes = require("mongoose-types"),
  useTimestamps = mongooseTypes.useTimestamps;


function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}


function in_array(what, where) {
  var len = where.length;
  for (var i = 0; i < len; i++) {
    if (what == where[i]) {
      return true;
    }
  }
  return false;
}

module.exports = exports = function (mongoose, config) {
  mongooseTypes.loadTypes(mongoose);
  var Schema = mongoose.Schema;

  //group schema, do not exposed by default
  var GroupSchema = new Schema({
    owner: String,
    name: String,
    members: [String]
  });

  GroupSchema.plugin(useTimestamps);

  GroupSchema.index({
    owner: 1,
    name: 1
  });

  GroupSchema.methods.isOwner = function (usernameOrUserObject) {
    var userNameToBeTested = '';
    if (typeof usernameOrUserObject === 'string') {
      userNameToBeTested = usernameOrUserObject;
    } else {
      if (typeof usernameOrUserObject.username === 'string') {
        userNameToBeTested = usernameOrUserObject.username;
      } else {
        throw new Error('someGroup.isMember(usernameOrUserObject) accepts only Users Mongoose Objects or Strings as argument!');
      }
    }
    return (this.owner === userNameToBeTested);
  };
  GroupSchema.methods.isMember = function (usernameOrUserObject) {
    var userNameToBeTested = '';
    if (typeof usernameOrUserObject === 'string') {
      userNameToBeTested = usernameOrUserObject;
    } else {
      if (typeof usernameOrUserObject.username === 'string') {
        userNameToBeTested = usernameOrUserObject.username;
      } else {
        throw new Error('someGroup.isMember(usernameOrUserObject) accepts only Users Mongoose Objects or Strings as argument!');
      }
    }
    if (this.owner === userNameToBeTested) {
      return true;
    } else {
      return in_array(userNameToBeTested.username, this.members);
    }
  };
  GroupSchema.methods.addMember = function (usernameOrUserObject, callback) {
    var userLoginToBeAdded = '';
    if (typeof usernameOrUserObject === 'string') {
      userLoginToBeAdded = usernameOrUserObject;
    } else {
      if (typeof usernameOrUserObject.username === 'string') {
        userLoginToBeAdded = usernameOrUserObject.username;
      } else {
        throw new Error('someGroup.isMember(usernameOrUserObject) accepts only Users Mongoose Objects or Strings as argument!');
      }
    }
    if (this.isMember(userLoginToBeAdded)) {
      callback(new Error('User with login "' + userLoginToBeAdded + '" already is in group of "' + this.name + '"'));
    } else {
      this.members.push(userLoginToBeAdded);
      this.save(callback);
    }
    return;
  };
  GroupSchema.methods.removeMember = function (usernameOrUserObject, callback) {
    var userLoginToBeAdded = '';
    if (typeof usernameOrUserObject === 'string') {
      userLoginToBeAdded = usernameOrUserObject;
    } else {
      if (typeof usernameOrUserObject.username === 'string') {
        userLoginToBeAdded = usernameOrUserObject.username;
      } else {
        throw new Error('someGroup.isMember(usernameOrUserObject) accepts only Users Mongoose Objects or Strings as argument!');
      }
    }

    if (this.isMember(userLoginToBeAdded)) {
      //this.members[indexOfUser]=null; //this is not correct, because
      //http://stackoverflow.com/questions/500606/javascript-array-delete-elements
      this.members.splice(indexOfUser, 1);
      this.save(callback);
    } else {
      callback(new Error('User with login "' + userLoginToBeAdded + '" do not belongs to group of "' + this.name + '"'));
    }
    return;
  };
  GroupSchema.methods.setOwner = function (usernameOrUserObject, callback) {
    var userLoginToBeAdded = '';
    if (typeof usernameOrUserObject === 'string') {
      userLoginToBeAdded = usernameOrUserObject;
    } else {
      if (typeof usernameOrUserObject.username === 'string') {
        userLoginToBeAdded = usernameOrUserObject.username;
      } else {
        throw new Error('someGroup.isMember(usernameOrUserObject) accepts only Users Mongoose Objects or Strings as argument!');
      }
    }
    this.owner = userLoginToBeAdded;
    this.save(callback);
    return;
  };
  //end of group schema


  var UserSchema = new Schema({
    email: Email,
    username: String,
    salt: String,
    password: String,

    groups: [String],//user can be part of many groups
    groupsOwning: [String],//user can be owner of many groups

    apiKey: String, //for invalidating sessions by user request, for api interactions...

    active: Boolean

    /*/
     accounts: [
     {
     provider: String,
     id: String,
     displayName: String,
     name: {
     familyName: String,
     givenName: String,
     middleName: String
     },
     emails: [
     {
     value: String,
     type: {
     type: String
     }
     }
     ],
     phoneNumbers: [
     {
     value: String,
     type: {
     type: String
     }
     }
     ],
     photos: [
     {
     value: String
     }
     ]
     }
     ],
     //*/
  });
  UserSchema.plugin(useTimestamps);//add createdAt, and updatedAt attributes

  UserSchema.index({
    email: 1,
    username: 1,
    apiKey: 1
  });

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
        expired = (typeof config.confirmationLinkExpire === 'undefined') ? 1 :
          config.confirmationLinkExpire;

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


  UserSchema.methods.verifyPassword = function (password) {
    return sha512('' + this.salt + password) === this.password;
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
  }

  //group managment
  UserSchema.methods.isOwnerOfGroup = function (groupname) {
    return (this.groupsOwning.indexOf(groupname) === -1);
  };
  UserSchema.methods.isMemberOfGroup = function (groupname) {
    return (this.groups.indexOf(groupname) === -1);
  };
  UserSchema.methods.inviteToGroup = function (groupname,callback) {
    var thisUser=this;

    if(thisUser.isOwnerOfGroup(groupname)){
      callback(new Error('User "'+thisUser.username+'" is an owner of a group "'+groupname+'"'),false);
      return;
    }

    if(thisUser.isMemberOfGroup(groupname)){
      callback(new Error('User "'+thisUser.username+'" is a member of a group "'+groupname+'"'),false);
      return;
    }

    async.waterfall([
      function(cb){
        //do the group exists?
        GroupSchema.findOne({'name':groupname},cb);
      },
      function(groupThatExists,cb){
        if(groupThatExists){
          cb(null,groupThatExists);
        } else {
          //creating the group that do not exists
          GroupSchema.create({'name':groupname},cb);
        }
      },
      function(groupToAddUser,cb){
        groupToAddUser.members.push(thisUser.username);
        groupToAddUser.save(cb);
      },
      function(cb){
        thisUser.groups.push(groupname);
        thisUser.save(cb);
      }
    ],callback)
  };

  UserSchema.methods.giveOwnershipOfGroup = function(groupname,callback){

  };
  UserSchema.methods.removeFromGroup = function (groupname) {
    var thisUser=this;

    if(!thisUser.isOwnerOfGroup(groupname)){
      callback(new Error('User "'+thisUser.username+'" is an owner of a group "'+groupname+'"'),false);
      return;
    }

    if(!thisUser.isMemberOfGroup(groupname)){
      callback(new Error('User "'+thisUser.username+'" is a member of a group "'+groupname+'"'),false);
      return;
    }

    async.waterfall([
      function(cb){
        //do the group exists?
        GroupSchema.findOne({'name':groupname},cb);
      },
      function(groupThatExists,cb){
        if(groupThatExists){
          cb(null,groupThatExists);
        } else {
          //creating the group that do not exists
          GroupSchema.create({'name':groupname},cb);
        }
      },
      function(groupToAddUser,cb){
        groupToAddUser.members.push(thisUser.username);
        groupToAddUser.save(cb);
      },
      function(cb){
        thisUser.groups.push(groupname);
        thisUser.save(cb);
      }
    ],callback)
  };


  return mongoose.model('users', UserSchema);
};