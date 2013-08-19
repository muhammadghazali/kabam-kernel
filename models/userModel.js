var async = require('async'),
  crypto = require('crypto');

function sha512(str) {
  return crypto.createHash('sha512').update(str).digest('hex').toString();
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}


var rackSeed = crypto.randomBytes(64);
function rack() {
  var result = sha512(rackSeed + crypto.randomBytes(64).toString());
  rackSeed = result;
  return result;
}

exports.init = function (mwc) {
  var mongoose = mwc.mongoose;

  var Schema = mongoose.Schema;

  /**
   * @ngdoc function
   * @name User
   * @description
   * Mongoose object to represent single user from mongoose users collection
   * Injected by means of PassportJS to request object in application route to represent the current active user
   */

  /**
   * @ngdoc function
   * @name mwc.model
   * @description
   * Mongooses collections of objects to manipulate data in mongo database
   */

  /**
   * @ngdoc function
   * @name mwc.model.User
   * @methodOf mwc.model
   * @description
   * Active record style Mongoose object to manipulate users collection
   */

  var UserSchema = new Schema({
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.email
     * @description
     * Primary email of user, the one he/she used for registration. Unique.
     */
    email: {type: String, required: true, unique: true, match: /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/},
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.username
     * @description
     * Primary username of user, the one he/she used for registration. Unique.
     */
    username: {type: String, unique: true, match: /^[a-zA-Z0-9_]+$/, sparse: true},
    //sparse - it means it be unique, if not null  http://stackoverflow.com/questions/7955040/mongodb-mongoose-unique-if-not-null
    salt: String,//string to hash password
    password: String,//hashed password

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.apiKey
     * @description
     * Unique apiKey of user,
     */
    apiKey: {type: String, required: true, unique: true, default: rack, match: /^[a-zA-Z0-9_]+$/ }, //for invalidating sessions by user request, for api interactions...
    apiKeyCreatedAt: Date,

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.lang
     * @description
     * Preferred language of user
     */
    lang: {type: String, default:'en', match:/^[a-z]{2}$/},

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.root
     * @description
     * Is user root? - boolean
     */
    root: Boolean,

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.roles
     * @description
     * Array of user roles/permissions (strings)
     */
    roles: [
      {type: String, match: /^[a-zA-Z0-9_]+$/ }
    ],

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.firstName
     * @description
     * Firts name of user
     */
    firstName: String,
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.lastName
     * @description
     * Last name of user
     */
    lastName: String,
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.skype
     * @description
     * Skype id of user
     */
    skype: String,

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.emailVerified
     * @description
     * Is email address verified? - boolean
     */
    emailVerified: Boolean,
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.profileComplete
     * @description
     * Is profile complete - it means, it have email, username and password set. boolean
     */
    profileComplete: Boolean,

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.keychain
     * @description
     * Profile keychain. For example, the one like it
     * ```javascript
     * { "github":"111", "twitter":"111" }
     * ```
     * allows user to sign in using oAuth providers if he has github id = 111 pr twitter id = 111
     * @see User.setKeychain
     */
    keychain: {}, // i'm loving mongoose - http://mongoosejs.com/docs/schematypes.html - see mixed

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.profile
     * @description
     * User profile object. it can store anything! - age, postal address, occupation. everything!
     */
    profile: Object
  });

  UserSchema.index({
    email: 1,
    username: 1,
    apiKey: 1,
    keychain: 1,
    roles: 1
  });

  /**
   * @ngdoc function
   * @name User.getGravatar
   * @description
   * Returns the url to current user's gravatar
   * @url https://er.gravatar.com/site/implement/images/

   * @param {number} size - image size
   * @param {string} type - one of 404, mm, identicon, monsterid, wavatar, retro, blank
   * @param {string} rating - g,pg,r,x - rating of image
   * @returns {string} gravatarUrl
   *
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     console.log(user.getGravatar(140));
   * // -> https://secure.gravatar.com/avatar/02ba513b62ef9f2f7798b9bac1ccf822?s=140
   *   });
   *
   * ```
   */
  UserSchema.methods.getGravatar = function (size, type, rating) {
    size = size ? size : 300;
    type = type ? type : 'wavatar';
    rating = rating ? rating : 'g';
    return 'https://secure.gravatar.com/avatar/' + md5(this.email.toLowerCase().trim()) + '.jpg?s=' + size + '&d=' + type + '&r=' + rating;
  };
  /**
   * @ngdoc value
   * @methodOf User
   * @name User.gravatar
   * @description
   * Returns users gravatar
   */
  UserSchema.virtual('gravatar').get(function () {
      return this.getGravatar();
    });
  /**
   * @ngdoc function
   * @name User.verifyPassword
   * @description
   * Returns true, if password is correct for this user, or false, if it is not correct
   * @param {string} password - password to check
   * @returns {boolean} - true if password is correct, or false
   *
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     console.log(user.verifyPassword('someKey'));
   *   });
   *
   * ```
   */
  UserSchema.methods.verifyPassword = function (password) {
    return (sha512('' + this.salt + password) === this.password);
  };

  /**
   * @ngdoc function
   * @name User.setPassword
   * @description
   * Sets new password for user, calls callback when user is saved
   * @param {string} newPassword - password to be set
   * @param {function} callback - function is fired when user is saved
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     user.setPassword('someKey', function(err){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.setPassword = function (newPassword, callback) {
    var salt = sha512(rack());
    this.salt = salt;
    this.password = sha512('' + salt + newPassword);
    mwc.emit('users:setPassword',this);
    this.save(callback);
    return;
  };

  /**
   * @ngdoc function
   * @name User.invalidateSession
   * @description
   * Invalidates the apiKey, which results in immediate logoff for this user, and invalidating the access tokens.
   * @param {function} callback - function is fired when user is saved
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     user.invalidateSession(function(err,newKey){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.invalidateSession = function (callback) {
    var newApiKey = sha512(rack());
    this.apiKey = newApiKey;
    this.save(function(err){
      callback(err,newApiKey);
    });
  };

  /**
   * @ngdoc function
   * @name User.grantRole
   * @param {string} roleName - role/permission to grant. Every user can have manifold of roles.
   * @description
   * Grants role to user, fires callback on save
   * @param {function} callback - function is fired when user is saved
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     user.grantRole('rulerOfTheWorld', function(err){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.grantRole = function (roleName, callback) {
    if (this.roles.indexOf(roleName) === -1) {
      this.roles.push(roleName);
      mwc.emit('users:grantRole',this);
      this.save(callback);
    } else {
      callback(null);
    }
  };
  /**
   * @ngdoc function
   * @name User.hasRole
   * @param {string} roleName - role/permission to rcheck
   * @description
   * Returns true, if user has a role, returns false, if user has not have the role
   * @returns {boolean} - true if user have role
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     if(user.hasRole('rulerOfTheWorld')){
   *       ...
   *     } else {
   *       ...
   *     }
   *   });
   *
   * ```
   */
  UserSchema.methods.hasRole = function (roleName) {
    if (this.root) {
      return true;
    } else {
      return (this.roles.indexOf(roleName) !== -1);
    }
  };

  /**
   * @ngdoc function
   * @name User.revokeRole
   * @param {string} roleName - role/permission to revoke.
   * @description
   * Revokes role from user, fires callback on save
   * @param {function} callback - function is fired when user is saved
   * @example
   * ```javascript
   *
   *   MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     user.revokeRole('rulerOfTheWorld', function(err){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.revokeRole = function (roleName, callback) {
    var roleIndex = this.roles.indexOf(roleName);
    if (roleIndex === -1) {
      callback(null);
    } else {
      this.roles.splice(roleIndex, 1);
      mwc.emit('users:revokeRole',this);
      this.save(callback);
    }
  };

  /**
   * @ngdoc function
   * @name User.notify
   * @description
   * Notifies the current user, using the mwc event emitting system. For the present moment there is 2 event dispatchers that
   * can deliver notifications to users, first of them works by
   * [email](https://github.com/mywebclass/mwc_plugin_notify_by_email) notifications, and the second one by
   * [socket.io](https://github.com/mywebclass/mwc_plugin_socket_io) events.
   *
   * @param {string} [channel] - optional, channel name, default is 'all'
   * @param {string/object} message - something that the notify handler understands
   * @example
   * ```javascript
   *
   *     MWC.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *       user.notify('email','Happy birthday'); // sending email to this user
   *     });
   *
   *     // we catching the notify event later
   *     MWC.on('notify:email',function(emailObj){
   *       console.log('Sendind email to '+emailObj.user.email+' with text "' + emailObj.message+'"');
   *     });
   * ```
   */
  UserSchema.methods.notify = function (channel, message) {
    var channelToUse, messageToSend;
    if (typeof message === 'undefined' && (typeof channel === 'object' || typeof channel === 'string')) {
      channelToUse = 'all';
      messageToSend = channel;
    } else {
      if (typeof channel === 'string' && (typeof message === 'object' || typeof message === 'string')) {
        channelToUse = channel;
        messageToSend = message;
      } else {
        throw new Error('Function User.notify([channelNameString],messageObj) has wrond arguments!');
      }
    }

    mwc.emit('notify:' + channelToUse, {user: this, message: messageToSend});
    return;
  };

  //finders
  /**
   * @ngdoc function
   * @name mwc.model.User.findOneByLoginOrEmail
   * @description
   * Finds one user by login or email, returns as second argument in callback, first one is error
   * @param {string} loginOrEmai - login or email of user to be foundl
   * @param {function} callback - function is fired when user is saved
   * @example
   * ```javascript
   *
   *     MWC.model.User.findOneByLoginOrEmail('test@rambler.ru',function(err,userCreated){
   *       user.notify('email','Happy birthday'); // sending email to this user
   *     });
   * ```
   */
  UserSchema.statics.findOneByLoginOrEmail = function (loginOrEmail, callback) {
    if (/^[a-zA-Z0-9_]+$/.test(loginOrEmail)) {
      this.findOne({'username': loginOrEmail}, callback);
    } else {
      this.findOne({'email': loginOrEmail}, callback);
    }
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.findOneByApiKey
   * @description
   * Finds one user by apiKey, returns as second argument in callback, first one is error
   * @param {string} apiKey - apiKey of user to be foundl
   * @param {function} callback - function is fired when user is saved

   * @example
   * ```javascript
   *
   *     MWC.model.User.findOneByApiKey('apiKey',function(err,userCreated){
   *       user.notify('email','Happy birthday'); // sending email to this user
   *     });
   * ```
   */
  UserSchema.statics.findOneByApiKey = function (apiKey, callback) {
    this.findOne({'apiKey': apiKey}, callback);
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.getByRole
   * @description
   * Finds users who have desired role
   * @param {string} role - role/permission to search owners of
   * @param {function} callback - function is fired when users are found
   * @example
   * ```javascript
   *
   *     MWC.model.User.getByRole('admin',function(err,users){
   *       users.map(function(user){
   *         user.notify('email','Happy birthday'); // sending email to this user
   *       })
   *     });
   * ```
   */
  UserSchema.statics.getByRole = function (role, callback) {
    this.find({'roles': [role]}, callback);
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.processOAuthProfile
   * @param {string} email - email of user from oauth profile we want to process
   * @param {function} done - function is fired when users are found
   * @description
   * For some oauth providers, like google, who returns email in user's profile, we can use this email for preliminary
   * registration of user. He has email verified, but profile is not complete, because it do not have username and password
   * If user with such email exists in database, he is authorized
   * @example
   * ```javascript
   *
   * mwc.model.User.processOAuthProfile('someEmail@somedomain.com',function(err,user){
   *   assert.equal(true,user.emailVerified);
   *   assert.equal(false,user.profileComplete);
   *   assert.equal('someEmail@somedomain.com',user.email);
   * });
   * ```
   */
  UserSchema.statics.processOAuthProfile = function (email, done) {
    var Users = this;
    if (email) {
      Users.findOne({'email': email}, function (err, userFound) {
        if (err) {
          return done(err, false, {'message': 'Database broken...'});
        } else {
//          console.log('==============');
//          console.log(userFound);
//          console.log('==============');
          if (err) {
            return done(err);
          } else {
            if (userFound) {
              return done(err, userFound, {message: 'Welcome, ' + userFound.username});
            } else {
              Users.signUpByEmailOnly(email, function (err1, userCreated) {
                return done(err1, userCreated, { message: 'Please, complete your account!' });
              });
            }
          }
        }
      });
    } else {
      return done(new Error('There is something strange instead of user profile'));
    }
  };
  /**
   * @ngdoc function
   * @name mwc.model.User.signUp
   * @param {string} username - username for new user
   * @param {string} email - email for new user
   * @param {string} password - password for new user
   * @param {function}  callback  - function is fired when user is saved
   * @desription
   * signups new user by username, email, password, fires callback with first argument of error and the second one
   * of user created
   */
  UserSchema.statics.signUp = function (username, email, password, callback) {
    this.create({
      'username': username,
      'email': email,
      'apiKey': sha512(rack()),
      'emailVerified': false,
      'root': false,
      'profileComplete': true,
      'apiKeyCreatedAt': new Date()
    }, function (err, userCreated) {
      if (err) {
        callback(err);
      } else {
        userCreated.setPassword(password, function (err1) {
          if (err1) {
            callback(err1);
          } else {
            userCreated.notify('email', {'subject': 'Verify your email account!', 'template': 'signin'});
            mwc.emit('users:signUp',userCreated);
            callback(null, userCreated);
          }
        });
      }
    });
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.signUpByEmailOnly
   * @param {string}  email  - email for new user
   * @param {function}  callback  - function is fired when user is saved
   * @description
   * signup new user by email only - for example, when he sign in by google and other oauth providers with email present
   * account is set as uncompleted!
   */
  UserSchema.statics.signUpByEmailOnly = function (email, callback) {
    this.create({
      'email': email,
      'emailVerified': true, //email is verified!
      'profileComplete': false,
      'apiKey': sha512(rack()),
      'root': false,
      'apiKeyCreatedAt': new Date()
    }, function (err, userCreated) {
      if (err) {
        callback(err);
      } else {
        userCreated.setPassword(rack(), function (err1) {//because leaving user without password is stupid
          if (err1) {
            callback(err1);
          } else {
            mwc.emit('users:signUpByEmailOnly', userCreated);
            callback(null, userCreated);
          }
        });
      }
    });
  };

  /**
   * @ngdoc function
   * @name User.completeProfile
   * @description
   * Complete users profile for user created by mwc.model.user.signUpByEmailOnly
   * @param {string} username - username to set for user instance
   * @param {string} password - password to set for user instance
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.methods.completeProfile = function (username, password, callback) {
    if (typeof this.username === 'undefined' && this.profileComplete === false) {
      this.username = username;
      this.profileComplete = true;
      mwc.emit('users:completeProfile', this);
      this.setPassword(password, callback);
    } else {
      callback(new Error('Account is completed!'));
    }
  };

  /**
   * @ngdoc function
   * @name User.saveProfile
   * @description
   * Saves object as current users profile
   * @param {object} profile - username to set for user instance
   * @param {function} callback  - function is fired when user is saved
   */

  UserSchema.methods.saveProfile = function (profile, callback) {
    this.profile = profile;
    this.markModified('profile'); //http://mongoosejs.com/docs/schematypes.html
    mwc.emit('users:saveProfile', this);
    this.save(callback);
  };


  /**
   * @ngdoc function
   * @name User.setKeyChain
   * @description
   * Grants the current user possibility to login through 3rd side oauth provider
   * @param {string} provider - provider name
   * @param {string} id - provider's user's id
   * @param {function} callback  - function is fired when user is saved
   * @example
   * ```javascript
   * var userEgorLetov;
   * mwc.model.User.findOneByLoginOrEmail('EgorLetov',function(err,user){
   *   if(err) throw err;
   *   userEgorLetov=user;
   *   user.setKeyChain('paradise','with_Iuda',function(err){
   *    mwc.model.User.findOneByKeychain('paradise','with_Iuda',function(err,userFound){
   *      assert.equal(userFound.username, userEgorLetov.username);
   *    });
   *   });
   * });
   *
   * ```
   */
  UserSchema.methods.setKeyChain = function (provider, id, callback) {
    if(!this.keychain){
      this.keychain = {};
    }
    this.keychain[provider] = id;
    this.markModified('keychain'); //http://mongoosejs.com/docs/schematypes.html
    mwc.emit('users:setKeyChain', this);
    this.save(callback);
  };

  /**
   * @ngdoc function
   * @name User.revokeKeyChain
   * @description
   * Revokes the current user possibility to login through 3rd side oauth provider
   * @param {string} provider - provider name
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.methods.revokeKeyChain = function (provider, callback) {
    this.keychain[provider] = null;
    this.markModified('keychain'); //http://mongoosejs.com/docs/schematypes.html
    mwc.emit('users:revokeKeyChain', this);
    this.save(callback);
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.findOneByKeychain
   * @description
   * Finds user that have keychain for this provider and this id
   * @param {string} provider - provider name
   * @param {string} id - provider's user's id
   * @param {function} callback  - function is fired when user is saved
   * @example
   * ```javascript
   *    mwc.model.User.findOneByKeychain('paradise','with_Iuda',function(err,userFound){
   *      ...
   *    });
   *
   * ```
   */
  UserSchema.statics.findOneByKeychain = function (provider, id, callback) {
    var key = 'keychain.' + provider,
      needle = {};

    needle[key] = id;
    this.findOne(needle, function(err,userFound){
      if(err){
        callback(err);
      } else {
        if(userFound){
          userFound.invalidateSession(function(err2,newKey){
            userFound.apiKey=newKey;
            callback(err2, userFound);
          });
        } else {
          callback(err,null);
        }
      }
    });
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.findOneByApiKeyAndVerify
   * @description
   * This function is used for verifying users profile from link in email message
   * @param {string} apiKey - apiKey to use
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.statics.findOneByApiKeyAndVerify = function (apiKey, callback) {
    this.findOneByApiKey(apiKey, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound && userFound.emailVerified === false && (new Date().getTime() - userFound.apiKeyCreatedAt.getTime()) < 30 * 60 * 1000) {
          userFound.emailVerified = true;
          userFound.save(function (err1) {
            mwc.emit('users:findOneByApiKeyAndVerify', userFound);
            callback(err1, userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };

  /**
   * @ngdoc function
   * @name mwc.model.User.findOneByApiKeyAndResetPassword
   * @description
   * This function is used for reseting users password by link in email with submitting form later
   * @param {string} apiKey - apiKey to use
   * @param {string} password - new password to set
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.statics.findOneByApiKeyAndResetPassword = function (apiKey, password, callback) {
    this.findOneByApiKey(apiKey, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound && (new Date().getTime() - userFound.apiKeyCreatedAt.getTime()) < 30 * 60 * 1000) {
          userFound.setPassword(password, function (err1) {
            mwc.emit('users:indOneByApiKeyAndResetPassword', userFound);
            callback(err1, userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };


  //ACL for mwc_plugin_rest

  /**
   * @ngdoc function
   * @name mwc.model.User.getForUser
   * @param {User} user - user to test privileges, for example, the one from request object
   * @param {object} parameters - users field to find against
   * @param {function} callback - function(err,arrayOfUsersFound){...}
   * @description
   * This function return the array of users, that can be editable by current user.
   * Usually, if user is root, he can edit other users
   * @example
   */
  UserSchema.statics.getForUser = function(user,parameters,callback){
    if(user && user.root){
      this.find(parameters,callback);
    } else {
      callback(new Error('Access denied!'));
    }
  };
  /**
   * @ngdoc function
   * @name mwc.model.User.canCreate
   * @description
   * Can this user create new users by rest api? Returns true if he/she can.
   * If this user is root, he can do it.
   * @param {User} user - user to test privileges, for example, the one from request object
   * @returns {boolean} - true if he/she can.
   */
  UserSchema.statics.canCreate = function (user) {
    return (user && user.root);
  };
  /**
   * @ngdoc function
   * @name User.canRead
   * @description
   * Can this user read other users profiles by rest api? Returns true if he/she can.
   * If this user is root, he can do it.
   * @param {User} user - user to test privileges, for example, the one from request object
   * @returns {boolean} - true if he/she can.
   */
  UserSchema.methods.canRead = function (user) {
    return (user && user.root);
  };
  /**
   * @ngdoc function
   * @name User.canWrite
   * @description
   * Can this user update/delete other users' profiles by rest api? Returns true
   * If this user is root, he can do it.
   * @param {User} user - user to test privileges, for example, the one from request object
   * @returns {boolean} - true if he/she can.
   */
  UserSchema.methods.canWrite = function (user) {
    return (user && user.root);
  };

  return mwc.mongoConnection.model('User', UserSchema);
};



/**
 * @ngdoc function
 * @name Users.eventsEmitter
 * @description
 * When some user parameters are changed the kernel object emit events
 * with payload of object of affected user at state of current event.
 * @example
 * ```javascript
 * kabamKernel.on('users:revokeRole', function(user){...});
 * kabamKernel.on('users:signUp', function(user){...});
 * kabamKernel.on('users:signUpByEmailOnly', function(user){...});
 * kabamKernel.on('users:completeProfile', function(user){...});
 * kabamKernel.on('users:saveProfile', function(user){...});
 * kabamKernel.on('users:setKeyChain', function(user){...});
 * kabamKernel.on('users:revokeKeyChain', function(user){...});
 * kabamKernel.on('users:findOneByApiKeyAndVerify', function(user){...});
 * ```
 */
