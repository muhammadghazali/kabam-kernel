'use strict';
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

function factory(kabam) {
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
  var mongoose = kabam.mongoose,
    Schema = mongoose.Schema,
    UserSchema = new Schema({
      /**
       * @ngdoc value
       * @methodOf User
       * @name User.email
       * @description
       * Primary email of user, the one he/she used for registration. Unique.
       */
      email: {type: String, trim: true, index: true, unique: true, sparse: true, match: /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/},
      /**
       * @ngdoc value
       * @methodOf User
       * @name User.username
       * @description
       * Primary username of user, the one he/she used for registration. Unique.
       */
      username: {type: String, trim: true, index: true, unique: true, match: /^[a-zA-Z0-9_]+$/, sparse: true},
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
      lang: {type: String, default: 'en', match: /^[a-z]{2}$/},

      /**
       * @ngdoc value
       * @methodOf User
       * @name User.root
       * @description
       * Is user root? - boolean
       */
      root: {type: Boolean, default: false},

      /**
       * @ngdoc value
       * @methodOf User
       * @name User.isBanned
       * @description
       * Is user banned? - boolean
       */
      isBanned: {type: Boolean, default: false},

      /**
       * @ngdoc value
       * @methodOf User
       * @name User.roles
       * @description
       * Array of user roles/permissions (strings)
       */
      roles: [
        {type: String, match: /^[a-zA-Z0-9_]+$/, index: true }
      ],

      /**
       * @ngdoc value
       * @methodOf User
       * @name User.firstName
       * @description
       * Firts name of user
       */
      firstName: {type: String, trim: true},
      /**
       * @ngdoc value
       * @methodOf User
       * @name User.lastName
       * @description
       * Last name of user
       */
      lastName: {type: String, trim: true},
      /**
       * @ngdoc value
       * @methodOf User
       * @name User.skype
       * @description
       * Skype id of user
       */
      skype: {type: String, trim: true},

      /**
       * @ngdoc value
       * @methodOf User
       * @name User.emailVerified
       * @description
       * Is email address verified? - boolean
       */
      emailVerified: {type: Boolean, default: false},
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
      lastSeenOnline: Date,

      /**
       * @ngdoc value
       * @methodOf User
       * @name User.groups
       * @description
       * Array of groups' ID, user are a member of...
       * Role is defined IN group, not here
       */
      groups: [
        { type: kabam.mongoose.Schema.Types.ObjectId, ref: 'Group' }
      ]
    },{
      toObject: { getters: true, virtuals: true }, //http://mongoosejs.com/docs/api.html#document_Document-toObject
      toJSON: { getters: true, virtuals: true }
    });

//  UserSchema.index({
//    username: 1,
//    email: 1,
//    apiKey: 1,
//    keychain: 1,
//    roles: 1
//  });

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
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     console.log(user.getGravatar(140));
   * // -> https://secure.gravatar.com/avatar/02ba513b62ef9f2f7798b9bac1ccf822?s=140
   *   });
   *
   * ```
   */
  UserSchema.methods.getGravatar = function (size, type, rating) {
    size = size || 300;
    type = type || 'wavatar';
    rating = rating || 'g';
    var hash = md5(this.email && this.email.toLowerCase().trim() || '');
    return 'https://secure.gravatar.com/avatar/' + hash + '.jpg?s=' + size + '&d=' + type + '&r=' + rating;
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
   * @ngdoc value
   * @methodOf User
   * @name User.lastSeenOnlineAgo
   * @description
   * Returns how much milliseconds ago user was online
   */
  UserSchema.virtual('lastSeenOnlineAgo').get(function () {
    if (this.lastSeenOnline) {
      return ((new Date().getTime() - this.lastSeenOnline.getTime()));
    } else {
      return 10 * 365 * 24 * 60 * 60 * 1000; //month)))
    }
  });
  /**
   * @ngdoc function
   * @methodOf User
   * @name User.isOnline
   * @description
   * Returns true, of user was online in less than 1 minute
   */
  UserSchema.virtual('isOnline').get(function () {
    return (this.lastSeenOnlineAgo < 60000);
  });

  /**
   * @ngdoc value
   * @methodOf User
   * @name User.profileComplete
   * @description
   * Returns true, if user profile complete (has first and last names)
   */
    // TODO: test me please
  UserSchema.virtual('profileComplete').get(function () {
    return !!this.firstName && !!this.lastName;
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
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     console.log(user.verifyPassword('someKey'));
   *   });
   *
   * ```
   */
  UserSchema.methods.verifyPassword = function (password) {
    return (sha512(this.salt + password) === this.password);
  };

  /**
   * @ngdoc function
   * @name User.setPassword
   * @description
   * Sets new password for user, calls callback when user is saved
   * @param {string} newPassword - password to be set
   * @param {function} [callback] - if callback is provided user is saved and callback fired
   * @example
   * ```javascript
   *
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,user){
   *     user.setPassword('someKey', function(err){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.setPassword = function (newPassword, callback) {
    var salt = sha512(rack());
    this.salt = salt;
    this.password = sha512(salt + newPassword);
    kabam.emit('users:setPassword', this);
    if(callback) {this.save(callback);}
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
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     user.invalidateSession(function(err,newKey){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.invalidateSession = function (callback) {
    var newApiKey = sha512(rack());
    this.apiKey = newApiKey;
    this.apiKeyCreatedAt = new Date();
    this.save(function (err) {
      callback(err, newApiKey);
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
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *     user.grantRole('rulerOfTheWorld', function(err){if err throw err;});
   *   });
   *
   * ```
   */
  UserSchema.methods.grantRole = function (roleName, callback) {
    if (this.roles.indexOf(roleName) === -1) {
      this.roles.push(roleName);
      kabam.emit('users:grantRole', this);
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
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
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
   *   kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
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
      kabam.emit('users:revokeRole', this);
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
  UserSchema.methods.ban = function (callback) {
    this.isBanned = true;
    kabam.emit('users:ban', this);
    this.save(callback);
  };

  /**
   * @ngdoc function
   * @name User.unban
   * @description
   * Removes ban from this user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.methods.unban = function (callback) {
    this.isBanned = false;
    kabam.emit('users:unban', this);
    this.save(callback);
  };

  /**
   * @ngdoc function
   * @name User.export
   * @description
   * Returns the current user object without sensitive data
   * - apiKey, salt, passwords.
   * For now it returns object with
   *   `_id`, `username`, `lang`, `root`, `isBanned`,
   *   `roles`, `skype`, `lastName`, 'firstName', `profileComplete`, `isOnline`
   *
   * @return {object} - object of user profile with stripped sensitive
   * data.
   */
  UserSchema.methods.export = function () {
    var exportableProperties = [
        '_id',
        'username',
        'email',
        'gravatar',
        'lang',
        'root',
        'isBanned',
        'roles',
        'skype',
        'lastName',
        'firstName',
        'profileComplete',
        'isOnline',
        'keychain'
      ],
      ret = {},
      x;

    for (x in this) {
      if (exportableProperties.indexOf(x) !== -1) {
        ret[x] = this[x];
      }
    }
    return ret;
  };

  /**
   * @ngdoc function
   * @name User.safeJSON
   * @description
   * Returns a JSON encoded string with the user info. Safe to include in scripts
   * @return {string} - JSON encoded string with the user info
   */
  UserSchema.methods.safeJSON = function () {
    return JSON.stringify(this.export()).replace('</', '<\/');
  };

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.ban
   * @description
   * Bans this user
   * @param {string} usernameOrEmail  - username or email address of user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.statics.ban = function (usernameOrEmail, callback) {
    this.findOneByLoginOrEmail(usernameOrEmail, function (err, userFound) {
      if (err) {
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

  UserSchema.statics.unban = function (usernameOrEmail, callback) {
    this.findOneByLoginOrEmail(usernameOrEmail, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        userFound.unban(callback);
      }
    });
  };


  /**
   * @ngdoc function
   * @name User.notify
   * @description
   * Notifies the current user, using the kabam event emitting system. For the present moment there is 2 event dispatchers that
   * can deliver notifications to users, first of them works by
   * [email](https://github.com/mywebclass/kabam_plugin_notify_by_email) notifications, and the second one by
   * [socket.io](https://github.com/mywebclass/kabam_plugin_socket_io) events.
   * There is private messages module - [https://github.com/mykabam/kabam-plugin-private-message](https://github.com/mykabam/kabam-plugin-private-message)
   *
   * @param {string} [channel] - optional, channel name, default is 'all'
   * @param {string/object} message - something that the notify handler understands
   * @example
   * ```javascript
   *
   *     kabam.model.User.create({'email':'test@rambler.ru'},function(err,userCreated){
   *       user.notify('email','Happy birthday'); // sending email to this user
   *     });
   *
   *     // we catching the notify event later
   *     kabam.on('notify:email',function(emailObj){
   *       console.log('Sendind email to '+emailObj.user.email+' with text "' + emailObj.message+'"');
   *     });
   * ```
   */
  UserSchema.methods.notify = function (channel, message) {
    var channelToUse, messageToSend;
    if (message === undefined && (typeof channel === 'object' || typeof channel === 'string')) {
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
    kabam.emit('notify:' + channelToUse, {user: this, message: messageToSend});
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
   *     kabam.model.User.findOneByLoginOrEmail('test@rambler.ru',function(err,userCreated){
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
   * @name kabamKernel.model.User.findOneByUsernameOrEmail
   * @description
   * Alias for kabam.model.User.findOneByLoginOrEmail
   * @param {string} usernameOrEmail  - username or email address of user
   * @param {function} callback  - function is fired when user is saved
   */
  UserSchema.statics.findOneByUsernameOrEmail = UserSchema.statics.findOneByLoginOrEmail;

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
   *     kabam.model.User.findOneByApiKey('apiKey',function(err,userCreated){
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
   *     kabam.model.User.getByRole('admin',function(err,users){
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
    var thisSchema = this;
    if (!username) {
      callback(new Error('Username is required'));
      return;
    }
    // first find if some filed already taken
    thisSchema.findOne({'$or':[{username:username}, {email:email}]}, function(err, user){
      if(err){
        kabam.emit('error',err);
        callback(new Error('Something went wrong'));
        return;
      }
      if(user){
        if(user.email === email){
          callback(new Error('Email already taken'));
          return;
        }
        if(user.username === username){
          callback(new Error('Username already taken'));
          return;
        }
      }
      // create a user if username and email are available
      thisSchema.create({
        'username': username,
        'email': email,
        'apiKey': sha512(rack()),
        'emailVerified': false,
        'root': false,
        'profileComplete': true,
        'apiKeyCreatedAt': new Date()
      }, function (err, userCreated) {
        if (err) {
          kabam.emit('error',err);
          callback(new Error('Something went wrong'));
          return;
        } else {
          userCreated.setPassword(password, function (err1) {
            if (err1) {
              callback(new Error('Something went wrong'));
              kabam.emit('error',err1);
              return;
            } else {
              userCreated.notify('email', {'subject': 'Verify your email account!', 'template': 'signin'});
              kabam.emit('users:signUp', userCreated);
              callback(null, userCreated);
              return;
            }
          });
        }
      });
    });
  };

  /**
   * @typedef OauthProfile
   * @type {object}
   * @property {string|number} id - an ID.
   * @property {string} provider - profiver name.
   * @property {Array.<{value:String}>} emais - emails array.
   */

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.signUpByEmailOnly
   * @param {string} email  - email for new user
   * @param {OauthProfile} profile  -  User profile from the service
   * @param {function} callback  - function is fired when user is saved
   * @description
   * signup new user by email only - for example, when he sign in by google and other oauth providers with email present
   * account is set as uncompleted!
   */
  UserSchema.statics.signUpByEmailOnly = function (email, profile, callback) {
    var data = {
      'email': email,
      'emailVerified': true, //email is verified!
      'apiKey': sha512(rack()),
      'root': false,
      'apiKeyCreatedAt': new Date()
    };

    // jshint expr: true
    profile.firstName && (data.firstName = profile.firstName);
    profile.lastName && (data.lastName = profile.lastName);

    this.create(data, function (err, userCreated) {
      if (err) {
        return callback(err);
      }
      kabam.emit('users:signUpByEmailOnly', userCreated);
      callback(null, userCreated);
    });
  };

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.linkEmailOnlyProfile
   * @param {string} email - email of user from oauth profile we want to process
   * @param {OauthProfile} profile  -  User profile from the service
   * @param {function} done - function is fired when users are found
   * @description
   * For some oauth providers, like google, who returns email in user's profile, we can use this email for preliminary
   * registration of user. He has email verified, but profile is not complete, because it do not have username and password
   * If user with such email exists in database, he is authorized
   * @example
   * ```javascript
   *
   * kabam.model.User.linkEmailOnlyProfile('someEmail@somedomain.com', {firstName:'John'}, function(err,user){
   *   assert.equal(true,user.emailVerified);
   *   assert.equal(false,user.profileComplete);
   *   assert.equal('someEmail@somedomain.com',user.email);
   * });
   * ```
   */
  UserSchema.statics.linkEmailOnlyProfile = function (email, profile, done) {
    var Users = this;
    if (!email) {return done(new Error('There is something strange instead of user profile'));}
    Users.findOne({'email': email}, function (err, userFound) {
      if (err) {return done(err, false, {'message': 'Database broken...'});}
      if (userFound) {return done(err, userFound, {message: 'Welcome, ' + userFound.username});}
      Users.signUpByEmailOnly(email, profile, function (err1, userCreated) {
        return done(err1, userCreated, { message: 'Please, complete your account!' });
      });
    });
  };


  /**
   * @ngdoc function
   * @name kabamKernel.model.User.signUpWithService
   * @param {String} [email] optional email for a user
   * @param {OauthProfile} profile User profile from the service
   * @param {function(err:Error, user:User?, created:Boolean?)} done callback
   */
  UserSchema.statics.signUpWithService = function(email, profile, done){
    var data = {
      'profileComplete': false,
      'apiKey': sha512(rack()),
      'root': false,
      'apiKeyCreatedAt': new Date()
    };

    // jshint expr: true
    profile.firstName && (data.firstName = profile.firstName);
    profile.lastName && (data.lastName = profile.lastName);

    // if profile has email we are trusting the provider and consider that this email is verified
    if(email){
      data.email = email;
      data.emailVerified = true;
    }

    // finally create a new user
    this.create(data, function(err, user){
      if(err) {return done(err);}
      user.setKeyChain(profile.provider, profile.id, function (err) {
        if (err) {return done(err);}
        // last true parameter is for marking user as newly created
        done(null, user, true);
      });
    });
  };

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.findAndLinkWithService
   * @param {boolean} canCreate - If true will create a new user account if doesn't exists
   * @param {OauthProfile} profile User profile from the service
   * @param {function(err:Error, user:(User|Boolean)?, errorOrCreated:(Object|Boolean)?)} done callback
   * @description
   * Tries to find an existing user using provider name and profile id, if the user is found returns it.
   * Otherwise creates a new user.
   */
  UserSchema.statics.findAndLinkWithService = function(canCreate, profile, done){
    var User = this;
    User.findOneByKeychain(profile.provider, profile.id, function(err, user){
      if(err) {return done(err);}
      // we found a user, return them.
      if(user) {return done(null, user, false);}

      var email, serviceName;
      if(Array.isArray(profile.emails) && profile.emails.length){
        email = profile.emails[0].value;
      }

      // if we can't create new accounts using this service.
      if(!canCreate){
        serviceName = (profile.provider.charAt(0).toUpperCase() + profile.provider.slice(1));
        return done(null, false, {message: 'Cannot login using ' + serviceName + '. '+
          'Please be sure you are registered and linked your account with '+serviceName});
      }

      // if we don't have a user with such keychain and we don't have an email in the profile, just signup them
      if(!email) {return User.signUpWithService(null, profile, done);}

      // if we have an email in the profile we must check if there is some one with such email
      User.findOneByUsernameOrEmail(email, function(err, user){
        if(err) {return done(err);}
        // if no one found, lets sign them up
        if(!user) {return User.signUpWithService(email, profile, done);}
        // otherwise lets notify a user.
        var message = 'Someone already registered with the email '+ email + '. ' +
          'If it\'s you, you have to login to your account to link it';
        done(null, false, {message:message});
      });
    });
  };

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.linkWithService
   * @param {User} user If we are linking logged in user we should provide their email
   * @param {OauthProfile} profile User profile from the service
   * @param {boolean} canCreate - If true will create a new user account if doesn't exists
   * @param {function(err:Error, user:(User|Boolean)?, errorOrCreated:(Object|Boolean)?)} done callback
   * @description
   * Links existing user with the service or creates a new user automatically linking it with the service.
   * If the user already linked with the service callback successfully returns the user but nothing changes in the database.
   */
  UserSchema.statics.linkWithService = function(user, profile, canCreate, done){
    // no user lets find them
    if(!user) {return this.findAndLinkWithService(canCreate, profile, done);}

    var provider = profile.provider;

    // Technically it is possible to associate multiple accounts per provider, but for now we limit them to just one
    if(user.keychain && user.keychain[provider] && user.keychain[provider] !== profile.id) {
      return done(null, false, {
        message: 'You already have linked another ' + (provider.charAt(0).toUpperCase() + provider.slice(1)) + ' profile'
      });
    }

    this.findOneByKeychain(profile.provider, profile.id, function(err, _user){
      if(err){return done(err);}
      if(_user && !_user._id.equals(user._id)){
        return done(null, false, {
          message: 'Someone already linked this ' + (provider.charAt(0).toUpperCase() + provider.slice(1)) + ' profile. ' +
            'Probably it was you but in another account'
        });
      }
      // just set keychain
      user.setKeyChain(provider, profile.id, function (err) {
        if (err) {return done(err);}
        done(null, user, false);
      });
    });
  };




  /**
   * @ngdoc function
   * @name User.saveProfile
   * @description
   * Saves object as current users profile.
   * Emit event of `users:saveProfile` with full user's object in it
   * @param {object} profile - username to set for user instance
   * @param {function} callback  - function is fired when user is saved
   */

  UserSchema.methods.saveProfile = function (profile, callback) {
    this.profile = profile;
    this.markModified('profile'); //http://mongoosejs.com/docs/schematypes.html
    kabam.emit('users:saveProfile', this);
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
   * kabam.model.User.findOneByLoginOrEmail('EgorLetov',function(err,user){
   *   if(err) throw err;
   *   userEgorLetov=user;
   *   user.setKeyChain('paradise','with_Iuda',function(err){
   *    kabam.model.User.findOneByKeychain('paradise','with_Iuda',function(err,userFound){
   *      assert.equal(userFound.username, userEgorLetov.username);
   *    });
   *   });
   * });
   *
   * ```
   */
  UserSchema.methods.setKeyChain = function (provider, id, callback) {
    if (!this.keychain) {
      this.keychain = {};
    }
    this.keychain[provider] = id;
    this.markModified('keychain'); //http://mongoosejs.com/docs/schematypes.html
    kabam.emit('users:setKeyChain', this);
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
    kabam.emit('users:revokeKeyChain', this);
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
   *    kabam.model.User.findOneByKeychain('paradise','with_Iuda',function(err,userFound){
   *      ...
   *    });
   *
   * ```
   */
  UserSchema.statics.findOneByKeychain = function (provider, id, callback) {
    var key = 'keychain.' + provider,
      needle = {};

    needle[key] = id;
    this.findOne(needle, function (err, userFound) {
      if (err) {
        callback(err);
      } else {
        if (userFound) {
          userFound.invalidateSession(function (err2, newKey) {
            userFound.apiKey = newKey;
            callback(err2, userFound);
          });
        } else {
          callback(err, null);
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
            kabam.emit('users:findOneByApiKeyAndVerify', userFound);
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
            kabam.emit('users:indOneByApiKeyAndResetPassword', userFound);
            callback(err1, userFound);
          });
        } else {
          callback(new Error('Activation key is wrong or outdated!'));
        }
      }
    });
  };


  //ACL for kabam_plugin_rest

  /**
   * @ngdoc function
   * @name kabamKernel.model.User.getForUser
   * @param {User} user - user to test privileges, for example, the one from request object
   * @param {object} parameters - users field to find against
   * @param {function} callback - function(err,arrayOfUsersFound){...}
   * @description
   * This function return the array of users, that can be editable by current user.
   * Usually, if user is root, he can edit other users
   */
  UserSchema.statics.getForUser = function (user, parameters, callback) {
    var callback2use,
      parameters2use;

    if (typeof parameters === 'function' && callback === undefined) {
      callback2use = parameters;
      parameters2use = {};
    } else {
      callback2use = callback;
      parameters2use = parameters;
    }

    if (user && user.root) {
      this.find(parameters2use)
        .skip(parameters2use.offset || 0)
        .limit(parameters2use.limit || 10)
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
   * @param {function} callback - function(err, booleanValueCanWrite)
   */
  UserSchema.statics.canCreate = function (user, callback) {
    callback(null, user && user.root);
  };
  /**
   * @ngdoc function
   * @name User.canRead
   * @description
   * Can this user read other users profiles by rest api? Returns true if he/she can.
   * If this user is root, he can do it.
   * @param {User} user - user to test privileges, for example, the one from request object
   * @param {function} callback - function(err, booleanValueCanWrite)
   */
  UserSchema.methods.canRead = function (user, callback) {
    callback(null, user && user.root);
  };
  /**
   * @ngdoc function
   * @name User.canWrite
   * @description
   * Can this user update/delete other users' profiles by rest api? Returns true
   * If this user is root, he can do it.
   * @param {User} user - user to test privileges, for example, the one from request object
   * @param {function} callback - function(err, booleanValueCanWrite)
   */
  UserSchema.methods.canWrite = function (user, callback) {
    callback(null, user && user.root);
  };

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
   * @param {User/string} to - receiver of message
   * @param {string} title - title of message
   * @param {string} message - text of message
   * @param {function} callback -function to be called on message delivery
   */
  UserSchema.methods.sendMessage = function (to, title, message, callback) {
    var User = this.constructor,
      _this = this;
    message = sanitaze(message).xss(true); //https://npmjs.org/package/validator - see xss
    title = sanitaze(title).xss(true); //https://npmjs.org/package/validator - see xss
    async.waterfall([
      function (cb) {
        if (typeof to === 'string') {
          User.findOneByLoginOrEmail(to, cb);
        } else {
          if (to._id) {
            cb(null, to);
          } else {
            cb(new Error('to have to be user instance or string of username or email'));
          }
        }
      },
      function (userFound, cb) {
        kabam.model.Message.create({
          'to': userFound._id,
          'toProfile': userFound._id,
          'from': _this._id,
          'fromProfile': _this._id,
          'title': title,
          'message': message
        }, function (err, messageCreated) {
          if (err) {
            cb(err);
          } else {
            cb(null, userFound, messageCreated);
          }
        });
      },
      function (to, messageCreated, cb) {
        kabam.emit('notify:pm', {
          'user': to,
          'from': _this,
          'title': messageCreated.title,
          'message': messageCreated.message
        });
        cb();
      }
    ], callback);
  };

  /**
   * @ngdoc function
   * @name User.receiveMessage
   * @description
   * Sends private message to this user from other one
   * @example
   * ```javascript
   * User1.sendMessage(User2,'hello!',function(err){if(err) throw err;});
   * //User1 sends message to User2
   * ```
   * @param {User/string} from - receiver of message
   * @param {string} title - title of message
   * @param {string} message - text of message
   * @param {function} callback -function to be called on message delivery
   */
  UserSchema.methods.receiveMessage = function (from, title,message, callback) {
    var User = this.constructor,
      _this = this;
    message = sanitaze(message).xss(true); //https://npmjs.org/package/validator - see xss
    title = sanitaze(title).xss(true); //https://npmjs.org/package/validator - see xss
    async.waterfall([
      function (cb) {
        if (typeof from === 'string') {
          User.findOneByLoginOrEmail(from, cb);
        } else {
          if (from._id) {
            cb(null, from);
          } else {
            cb(new Error('to have to be user instance or string of username or email'));
          }
        }
      },
      function (userFound, cb) {
        kabam.model.Message.create({
          'from': userFound._id,
          'fromProfile': userFound._id,
          'to': _this._id,
          'toProfile': _this._id,
          'title':title,
          'message': message
        }, function (err, messageCreated) {
          if (err) {
            cb(err);
          } else {
            cb(null, userFound, messageCreated);
          }
        });
      },
      function (from, messageCreated, cb) {
        kabam.emit('notify:pm', {
          'user': _this,
          'from': from,
          'title': title,
          'message': messageCreated.message
        });
        cb();
      }
    ], callback);
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
  UserSchema.methods.getRecentMessages = function (mesgLimit, mesgOffset, callback) {
    kabam.model.Message
      .find({'to': this._id})
      .populate('fromProfile')
      .populate('toProfile')
      .skip(mesgOffset)
      .limit(mesgLimit)
      .sort('-createdAt')
      .exec(callback);
  };
  /**
   * @ngdoc function
   * @name User.getDialog
   * @description
   * Get recent messages for dialog with this and user with username in reverse chronological order  - the most recent on top
   * @param {User} usernameOrUser - author of message - string of username/email or user object
   * @param {int} mesgLimit - limit of messages
   * @param {int} mesgOffset - offset
   * @param {function} callback -function(err,messages) to be called with message object
   */
  UserSchema.methods.getDialog = function (usernameOrUser, mesgLimit, mesgOffset, callback) {
    var User = this.constructor,
      _this = this;
    async.waterfall([
      function (cb) {
        if (typeof usernameOrUser === 'string') {
          User.findOneByLoginOrEmail(usernameOrUser, cb);
        } else {
          if (usernameOrUser._id) {
            cb(null, usernameOrUser);
          } else {
            cb(new Error('usernameOrUser have to be user instance or string of username or email'));
          }
        }
      },
      function (userFound, cb) {
        if (userFound) {
          kabam.model.Message
            .find({
              $or: [
                {'to': _this._id, 'from': userFound._id},
                {'from': _this._id, 'to': userFound._id}
              ]
            })
            .populate('fromProfile')
            .populate('toProfile')
            .skip(mesgOffset)
            .limit(mesgLimit)
            .sort('-createdAt')
            .exec(cb);
        } else {
          cb(new Error('User do not exists!'));
        }
      }
    ], callback);
  };

  /**
   * @ngdoc function
   * @name User.getGroups
   * @description
   * Return the array of groups, where current user is a member/admin/something else
   * @param {function} callback -function(err,arrayOfGroups) to be called with groups objects' array
   */
  UserSchema.methods.getGroups = function (callback) {
    var groups = [];
    async.each(this.groups, function (groupId, cb) {
      kabam.model.Group.findOne({'id': groupId}, function (err, groupFound) {
        if (err) {
          cb(err);
        } else {
          groups.push(groupFound);
          cb(null);
        }
      });
    }, function (err) {
      callback(err, groups);
    });
  };

  /**
   * @ngdoc function
   * @name User.inviteToGroup
   * @param {String} groupId Group ID
   * @param {String} role Role
   * @description
   * Gives the current user role in group
   * @param {function} callback callback function
   */
  UserSchema.methods.inviteToGroup = function (groupId, role, callback) {
    var thisUser = this;
    kabam.model.Group.findOne({'_id': groupId}, function (err, groupFound) {
      if (err) {
        callback(err);
      } else {
        if (groupFound) {
          groupFound.invite(thisUser, role, callback);
        } else {
          callback(new Error('Unable to find this group!'));
        }
      }
    });
  };

  /**
   * @ngdoc function
   * @name User.banFromGroup
   * @param {String} groupId Group ID
   * @description
   * Removes current user from this group
   * @param {function} callback Callback
   */
  UserSchema.methods.banFromGroup = function (groupId, callback) {
    var thisUser = this;
    kabam.model.Group.findOne({'_id': groupId}, function (err, groupFound) {
      if (err) {
        callback(err);
      } else {
        if (groupFound) {
          groupFound.ban(thisUser, callback);
        } else {
          callback(new Error('Unable to find this group!'));
        }
      }
    });
  };

  /**
   * @ngdoc function
   * @name User.getRole
   * @param {String} groupId Group ID
   * @description
   * Removes current user from this group
   * @param {function} callback - function(err,stringOfRoleName);
   */
  UserSchema.methods.getRole = function (groupId, callback) {
    var thisUser = this;
    kabam.model.Group.findOne({'_id': groupId}, function (err, groupFound) {
      if (err) {
        callback(err);
      } else {
        if (groupFound) {
          groupFound.checkRights(thisUser, callback);
        } else {
          callback(new Error('Unable to find this group!'));
        }
      }
    });
  };

  return UserSchema;
}

exports.name = 'kabam-core-models-user';
exports.model = {
  User: factory
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
 * kabamKernel.on('users:saveProfile', function(user){...});
 * kabamKernel.on('users:setKeyChain', function(user){...});
 * kabamKernel.on('users:revokeKeyChain', function(user){...});
 * kabamKernel.on('users:findOneByApiKeyAndVerify', function(user){...});
 * kabamKernel.on('users:ban', function(user){...});
 * kabamKernel.on('users:unban', function(user){...});
 * ```
 */
