var async = require('async'),
  crypto = require('crypto'),
  sanitaze = require('validator').sanitize; //used for dealing with xss injections in private messages

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
   * @name kabamKernel.model
   * @description
   * Mongooses collections of objects to manipulate data in mongo database
   */

  /**
   * @ngdoc function
   * @name kabamKernel.model.User
   * @methodOf kabamKernel.model
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
    email: {type: String,trim: true, index: true, required: true, unique: true, match: /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/},
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.username
     * @description
     * Primary username of user, the one he/she used for registration. Unique.
     */
    username: {type: String,trim: true, index: true, unique: true, match: /^[a-zA-Z0-9_]+$/, sparse: true},
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
    apiKey: {type: String, required: true, index: true, unique: true, default: rack, match: /^[a-zA-Z0-9_]+$/ }, //for invalidating sessions by user request, for api interactions...
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
    root:  {type: Boolean, default:false},

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.isBanned
     * @description
     * Is user banned? - boolean
     */
    isBanned: {type: Boolean, default:false},

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
    firstName: {type : String, trim: true},
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.lastName
     * @description
     * Last name of user
     */
    lastName: {type : String ,trim: true},
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.skype
     * @description
     * Skype id of user
     */
    skype: {type : String, trim: true},

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.emailVerified
     * @description
     * Is email address verified? - boolean
     */
    emailVerified: {type: Boolean, default:false},
    /**
     * @ngdoc value
     * @methodOf User
     * @name User.profileComplete
     * @description
     * Is profile complete - it means, it have email, username and password set. boolean
     */
    profileComplete: {type: Boolean, default:false},

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
    keychain: {type: Object, index: true, unique: true, sparse: true}, // i'm loving mongoose - http://mongoosejs.com/docs/schematypes.html - see mixed

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.profile
     * @description
     * User profile object. it can store anything! - age, postal address, occupation. everything!
     */
    profile: {},

    /**
     * @ngdoc value
     * @methodOf User
     * @name User.lastSeenOnline
     * @description
     * Timestamp of last http interaction with site - last seen online
     */
    lastSeenOnline : Date
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
  );

  UserSchema.index({
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
      return this.getGravatar(80);
    });

  /**
   * @ngdoc function
   * @methodOf User
   * @name User.lastSeenOnlineAgo
   * @description
   * Returns how much milliseconds ago user was online
   */
  UserSchema.virtual('lastSeenOnlineAgo').get(function(){
    if(this.lastSeenOnline){
      return  ((new Date().getTime() - this.lastSeenOnline.getTime()));
    } else {
      return 10*365*24*60*60*1000; //month)))
    }
  });
  /**
   * @ngdoc function
   * @methodOf User
   * @name User.isOnline
   * @description
   * Returns true, of user was online in less than 1 minute
   */
  UserSchema.virtual('isOnline').get(function(){
    return  (this.lastSeenOnlineAgo < 60000);
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
   * @name User.ban
   * @description
   * Ban this user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.methods.ban = function(callback){
    this.isBanned = true;
    mwc.emit('users:ban',this);
    this.save(callback);
  };

  /**
   * @ngdoc function
   * @name User.unban
   * @description
   * Removes ban from this user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.methods.unban = function(callback){
    this.isBanned = false;
    mwc.emit('users:unban',this);
    this.save(callback);
  };

  /**
   * @ngdoc function
   * @name User.export
   * @description
   * Returns the current user object without sensitive data
   * - apiKey, salt, passwords, private email.
   * For now it returns object with
   *   `username`, `lang`, `root`, `isBanned`,
   *   `roles`, `skype`, `lastName`, 'firstName'
   *
   * @return {object} - object of user profile with stripped sensitive
   * data.
   */
  UserSchema.methods.export = function(){
    var exportableProperties = [
      'username',
      'gravatar',
      'lang',
      'root',
      'isBanned',
      'roles',
      'skype',
      'lastName',
      'firstName'
    ];
    var ret = {};
    for(var x in this){
      if(exportableProperties.indexOf(x) !== -1){
        ret[x] = this[x];
      }
    }
    return ret;
  };
  /**
   * @ngdoc function
   * @name kabamKernel.model.User.ban
   * @description
   * Bans this user
   * @param {string} usernameOrEmail  - username or email address of user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.statics.ban = function(usernameOrEmail,callback){
    this.findOneByLoginOrEmail(usernameOrEmail,function(err,userFound){
      if(err){
        callback(err);
      } else {
        userFound.ban(callback);
      }
    });
  };

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.unban
   * @description
   * Removes ban from this user
   * @param {string} usernameOrEmail  - username or email address of user
   * @param {function} callback  - function is fired when user is saved
   */

  UserSchema.statics.unban = function(usernameOrEmail,callback){
    this.findOneByLoginOrEmail(usernameOrEmail,function(err,userFound){
      if(err){
        callback(err);
      } else {
        userFound.unban(callback);
      }
    });
  };

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.findOneByUsernameOrEmail
   * @description
   * Alias for mwc.model.User.findOneByLoginOrEmail
   * @param {string} usernameOrEmail  - username or email address of user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.statics.findOneByUsernameOrEmail = UserSchema.statics.findOneByLoginOrEmail;

  /**
   * @ngdoc function
   * @name User.notify
   * @description
   * Notifies the current user, using the mwc event emitting system. For the present moment there is 2 event dispatchers that
   * can deliver notifications to users, first of them works by
   * [email](https://github.com/mywebclass/mwc_plugin_notify_by_email) notifications, and the second one by
   * [socket.io](https://github.com/mywebclass/mwc_plugin_socket_io) events.
   * There is private messages module - [https://github.com/mykabam/kabam-plugin-private-message](https://github.com/mykabam/kabam-plugin-private-message)
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
   * @name kabamKernel.model.User.findOneByLoginOrEmail
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
   * @name kabamKernel.model.User.findOneByApiKey
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
   * @name kabamKernel.model.User.getByRole
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
   * @name kabamKernel.model.User.processOAuthProfile
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
   * @name kabamKernel.model.User.signUp
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
   * @name kabamKernel.model.User.signUpByEmailOnly
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
      this.setPassword(password, function(err){
        if(err){
          callback('Unable to complete profile, username '+username+' is occupied!');
        } else {
          mwc.emit('users:completeProfile', this);
          callback(null);
        }
      });
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
   * @name kabamKernel.model.User.findOneByKeychain
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
   * @name kabamKernel.model.User.findOneByApiKeyAndVerify
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
   * @name kabamKernel.model.User.findOneByApiKeyAndResetPassword
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
   * @name kabamKernel.model.User.getForUser
   * @param {User} user - user to test privileges, for example, the one from request object
   * @param {object} parameters - users field to find against
   * @param {function} callback - function(err,arrayOfUsersFound){...}
   * @description
   * This function return the array of users, that can be editable by current user.
   * Usually, if user is root, he can edit other users
   * @example
   */
  UserSchema.statics.getForUser = function(user,parameters,callback){
    if(typeof parameters === "function" && typeof callback === "undefined"){
      var callback2use = parameters,
        parameters2use = {};
    } else {
      var callback2use = callback,
        parameters2use = parameters;
    }

    if(user && user.root){
      this.find(parameters2use)
        .skip(((parameters2use.offset)?(parameters2use.offset):0))
        .limit(((parameters2use.limit)?(parameters2use.limit):10))
        .exec(callback2use);
    } else {
      callback2use(new Error('Access denied!'));
    }
  };
  /**
   * @ngdoc function
   * @name kabamKernel.model.User.canCreate
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

  //private messages
  var messageSchema = new mongoose.Schema({
      'to': mongoose.Schema.Types.ObjectId,
      'toProfile':{
        'username':String,
        'gravatar':String,
        'lang':String,
        'root':Boolean,
        'isBanned':Boolean,
        'roles':[String],
        'skype':String,
        'lastName':String,
        'firstName':String
      },
      'from': mongoose.Schema.Types.ObjectId,
      'fromProfile':{
        'username':String,
        'gravatar':String,
        'lang':String,
        'root':Boolean,
        'isBanned':Boolean,
        'roles':[String],
        'skype':String,
        'lastName':String,
        'firstName':String
      },
      'created_at': { type: Date, default: Date.now },
      'message': {type: String, trim: true } //trim whitespaces - http://mongoosejs.com/docs/api.html#schema_string_SchemaString-trim
  });

  messageSchema.index({
    to: 1,
    from: 1,
    created_at: 1
  });
//methods for Message schema so it can work with kabam-plugin-rest VVV

  messageSchema.statics.getForUser = function (user, parameters, callback) {
    if (user && user._id) {
      user.getRecentMessages(parameters.limit, parameters.offset, callback);
    } else {
      callback(null);
    }
  };
  messageSchema.statics.canCreate = function (user) {
    return (user && user.emailVerified && user.profileComplete && !user.isBanned);
  };
  messageSchema.methods.canRead = function (user) {
    return (user && (user._id === this.to || user._id === this.from));
  };
  messageSchema.methods.canWrite = function (user) {
    return false;
  };
//methods for Message schema so it can work with kabam-plugin-rest ^^^

  var Message = mwc.mongoConnection.model('messages', messageSchema);

/**
 * @ngdoc function
 * @name User.sendMessage
 * @description
 * Sends private message from this user to other one
 * @example
 * ```javascript
 * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
 * //User1 sends message to User2
 * ```
 * @param {User/string} to - reciever of message
 * @param {string} message - text of message
 * @param {function} callback -function to be called on message delivery
 */
  UserSchema.methods.sendMessage = function(to,message,callback){
  var thisUser = this;
  message = sanitaze(message).xss(true); //https://npmjs.org/package/validator - see xss
    async.waterfall([
      function(cb){
        if(typeof to === 'string'){
          User.findOneByLoginOrEmail(to, cb);
        } else {
          if(to._id){
            cb(null,to);
          } else {
            cb(new Error('to have to be user instance or string of username or email'));
          }
        }
      },
      function(userFound,cb){
        Message.create({
          'to': userFound._id,
          'toProfile': userFound.export(),
          'from': thisUser._id,
          'fromProfile': thisUser.export(),
          'message': message
        },function(err,messageCreated){
          if(err){
            cb(err);
          } else {
            cb(null, userFound, messageCreated);
          }
        });
      },
      function(to,messageCreated,cb){
        mwc.emit('notify:pm',{
          'user':to,
          'from':thisUser,
          'message':messageCreated.message
        });
        cb();
      }
    ],callback);
  };

  /**
   * @ngdoc function
   * @name User.recieveMessage
   * @description
   * Sends private message to this user from other one
   * @example
   * ```javascript
   * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
   * //User1 sends message to User2
   * ```
   * @param {User/string} from - reciever of message
   * @param {string} message - text of message
   * @param {function} callback -function to be called on message delivery
   */
  UserSchema.methods.recieveMessage = function(from,message,callback){
    var thisUser = this;
    message = sanitaze(message).xss(true); //https://npmjs.org/package/validator - see xss
    async.waterfall([
      function(cb){
        if(typeof from === 'string'){
          User.findOneByLoginOrEmail(from, cb);
        } else {
          if(from._id){
            cb(null,from);
          } else {
            cb(new Error('to have to be user instance or string of username or email'));
          }
        }
      },
      function(userFound,cb){
        Message.create({
          'from': userFound._id,
          'fromProfile': userFound.export(),
          'to': thisUser._id,
          'toProfile': thisUser.export(),
          'message': message
        },function(err,messageCreated){
          if(err){
            cb(err);
          } else {
            cb(null, userFound, messageCreated);
          }
        });
      },
      function(from,messageCreated,cb){
        mwc.emit('notify:pm',{
          'user': thisUser,
          'from': from,
          'message':messageCreated.message
        });
        cb();
      }
    ],callback);
  };

/**
 * @ngdoc function
 * @name User.getRecentMessages
 * @description
 * Get recent messages in reverse chronological order - the most recent on top
 * @param {int} mesgLimit - limit of messages
 * @param {int} mesgOffset - offset
 * @param {function} callback -function(err,messages) to be called with message object
 */
  UserSchema.methods.getRecentMessages = function(mesgLimit,mesgOffset,callback){
      Message
        .find({'to': this._id})
        .skip(mesgOffset)
        .limit(mesgLimit)
        .sort('-created_at')
        .exec(callback);
  };
/**
 * @ngdoc function
 * @name User.getDialog
 * @description
 * Get recent messages for dialog with this and user with username in reverse chronological order  - the most recent on top
 * @param {User} usernameOrUser - author of message
 * @param {int} mesgLimit - limit of messages
 * @param {int} mesgOffset - offset
 * @param {function} callback -function(err,messages) to be called with message object
 */
  UserSchema.methods.getDialog = function(usernameOrUser, mesgLimit, mesgOffset, callback){
    var thisUser = this;
    async.waterfall([
      function(cb){
        if(typeof usernameOrUser === 'string'){
          User.findOneByLoginOrEmail(usernameOrUser, cb);
        } else {
          if(usernameOrUser._id){
            cb(null,usernameOrUser);
          } else {
            cb(new Error('from have to be user instance or string of username or email'));
          }
        }
      },
      function(userFound,cb){
        if(userFound){
        Message
            .find({
              $or: [
                {'to': thisUser._id, 'from': userFound._id},
                {'from': thisUser._id, 'to': userFound._id}
              ]
            })
            .skip(mesgOffset)
            .limit(mesgLimit)
            .sort('-created_at')
            .exec(cb);
        } else {
          cb(new Error('User do not exists!'));
        }
      }
      ],callback);
  };

  var User = mwc.mongoConnection.model('User', UserSchema);
  return {
    'User':User,
    'Users':User,
    'Message':Message,
    'Messages':Message
  };
};



/**
 * @ngdoc function
 * @name User.eventsEmitter
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
 * kabamKernel.on('users:ban', function(user){...});
 * kabamKernel.on('users:unban', function(user){...});
 * ```
 */

/**
 * @ngdoc function
 * @name kabamKernel.model.User.eventsEmitter
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
 * kabamKernel.on('users:ban', function(user){...});
 * kabamKernel.on('users:unban', function(user){...});
 * ```
 */
