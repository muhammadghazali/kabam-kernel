/**
 * @ngdoc function
 * @name Plugin
 * @description
 * Plugin object, that can be loaded by kabam.usePlugin
 * @example
 * ```javascript
 * exports.name ='testPlugin333';
 *
 * exports.core = {
 *   'parameterOne': 1,
 *   'parameterTwo': [1, 2, 3, 4, 5],
 *   'parameterThree': {},
 *   'getSum': function (config) {
 *     return function (a, b) {
 *       return (a + b) * (config.multipyKoefficient);
 *     }
 *   }
 * };
 *
 * exports.model = {
 *   'Cats': function (mongoose, config) {
 *    var CatsSchema = new mongoose.Schema({
 *      'nickname': String
 *    });
 *
 *   return mongoose.model('cats', CatsSchema);
 *  },
 *  'Dogs': function (mongoose, config) {
 *    var DogsSchema = new mongoose.Schema({
 *      'nickname': String
 *    });
 *   return mongoose.model('Dogs', DogsSchema);
 *  }
 * };
 *
 * exports.app = function (kabam) {
 *   kabam.app.set('someValue',42);
 * };
 *
 *  exports.routes = function(kabam){
 *   kabam.app.get('/kittens',function(request,response){
 *     request.model.Cats.find({},function(err,cats){
 *       if(err) throw err;
 *       response.json(cats);
 *     });
 *   });
 *
 *   kabam.app.get('/dogs',function(request,response){
 *     request.model.Dogs.find({},function(err,dogs){
 *       if(err) throw err;
 *       response.json(dogs);
 *     });
 *   });
 * };
 *  exports.listeners = {
 *  'panic': function (panic) {
 *   console.log('panic!');
 *   console.log(panic);
 *  }
 * };
 * ```
 */

/**
 * @ngdoc function
 * @name Plugin.name
 * @description
 * Unique (in the scope of project) plugin name
 * @type {string}
 */
exports.name = 'pluginExample';
/**
 * @ngdoc function
 * @name Plugin.dependencies
 * @description
 * Plugins, that are required to be loaded previously  - not implemented yet
 * @type {Array}
 */
exports.dependencies = ['kabam_plugin_foo','kabam_plugin_bar']; //we throw error it this plugins are not loaded in application

/**
 * @ngdoc function
 * @name Plugin.core
 * @type {object}
 * @description
 * Object, that will be supplied as argument to kabam.extencCore function
 * @example
 * ```javascript
 * exports.core = {
 *   'parameterOne': 1,
 *   'parameterTwo': [1, 2, 3, 4, 5],
 *   'parameterThree': {},
 *   'getSum': function (config) {
 *     return function (a, b) {
 *       return (a + b) * (config.multipyKoefficient);
 *     }
 *   }
 * };
 * ```
 */
exports.core = {
  'parameterOne': 1,
  'parameterTwo': [1, 2, 3, 4, 5],
  'parameterThree': {},
  'getSum': function (config) {
    return function (a, b) {
      return (a + b) * (config.multipyKoefficient);
    }
  }
};

/**
 * @ngdoc function
 * @name Plugin.model
 * @type {object}
 * @description
 * Object, that will be supplied as argument to kabam.extendModel function
 * @example
 *```javascript
 * exports.model = {
 *  'Cats': function (mongoose, config) {
 *   var CatsSchema = new mongoose.Schema({
 *     'nickname': String
 *   });
 *
 *  return mongoose.model('cats', CatsSchema);
 * },
 * 'Dogs': function (mongoose, config) {
 *   var DogsSchema = new mongoose.Schema({
 *     'nickname': String
 *   });
 *  return mongoose.model('Dogs', DogsSchema);
 * }
 *};
 *```
 */
exports.model = {
  'Cats': function (mongoose, config) {
    var CatsSchema = new mongoose.Schema({
      'nickname': String
    });

    CatsSchema.index({
      nickname: 1
    });
    return CatsSchema;
  },

  'Dogs': function (mongoose, config) {
    var DogsSchema = new mongoose.Schema({
      'nickname': String
    });

    DogsSchema.index({
      nickname: 1
    });

    return DogsSchema;
  }
};

/**
 * @ngdoc function
 * @name Plugin.app
 * @type {function}
 * @description
 * Function, that will be supplied as argument to kabam.extendApp function
 * @example
 * ```javascript
 * exports.app = function (kabam) {
 *   kabam.app.set('someValue',42);
 * };
 * ```
 */
exports.app = function (kabam) {
  kabam.app.set('someValue',42);
};

var LinkedInStrategy = require('passport-linkedin').Strategy;

//sorry, only one(!) passportJS strategy per plugin!
exports.strategy = function (kabam) {
  return new LinkedInStrategy({
    consumerKey: kabam.config.passport.LINKEDIN_API_KEY,
    consumerSecret: kabam.config.passport.LINKEDIN_SECRET_KEY,
    callbackURL: kabam.config.hostUrl + 'auth/linkedin/callback'
  }, function (token, tokenSecret, profile, done) {
    console.log('==============');
    console.log(profile);
    console.log('==============');
    var email = profile.emails[0].value;
    if (email) {
      kabam.model.User.linkEmailOnlyProfile(email, done);
    } else {
      return done(new Error('There is something strange instead of user profile'));
    }
  });
};



/**
 * @ngdoc function
 * @name Plugin.middleware
 * @type {function}
 * @description
 * Function, that will be supplied as argument to kabam.extendMiddlware function
 * the most hard to understand function
 * because middleware conception is tricky and it do need the core object, for example,
 * in this way or maybe in some other way. But it do need the core!!!
 * for simplicity of code of plugin all middlewares are setted to all enviroments and are mounted to path /
 * @example
 * ```javascript
 * exports.middleware = [
 *   function (kabam) {
 *     return function (request, response, next) {
 *       request.model.Cats.count({name: 'Grumpy'}, function (err, numberOfCats) {
 *         if (numberOfCats > core.parameterOne) {
 *           request.getSum = core.getSum; //DI of core methods or values
 *           next();
 *        } else {
 *           response.send(500, 'There is not enough cats called "Grumpy" to run this application!');
 *         }
 *       });
 *     };
 *   },
 *   function (kabam) {
 *     return function (request, response, next) {
 *       request.model.Dogs.count({name: 'Strelka'}, function (err, numberOfDogs) {
 *         if (numberOfDogs > core.parameterOne) {
 *           request.getSum = core.getSum; //DI of core methods or values
 *           next();
 *         } else {
 *           response.send(500, 'There is not enough Dogs called "Strelka" to run this application!');
 *         }
 *       });
 *     };
 *   }
 * ];
 * ```
 */

exports.middleware = [
  function (kabam) {
    return function (request, response, next) {
      request.model.Cats.count({name: 'Grumpy'}, function (err, numberOfCats) {
        if (numberOfCats > core.parameterOne) {
          request.getSum = core.getSum; //DI of core methods or values
          next();
        } else {
          response.send(500, 'There is not enough cats called "Grumpy" to run this application!');
        }
      });
    };
  },
  function (kabam) {
    return function (request, response, next) {
      request.model.Dogs.count({name: 'Strelka'}, function (err, numberOfDogs) {
        if (numberOfDogs > core.parameterOne) {
          request.getSum = core.getSum; //DI of core methods or values
          next();
        } else {
          response.send(500, 'There is not enough Dogs called "Strelka" to run this application!');
        }
      });
    };
  }
];


/**
 * @ngdoc function
 * @name Plugin.routes
 * @type {function}
 * @description
 * Extend appliction routes, sends the value as argument to a function kabam.extendRoutes
 * @example
 * ```javascript
 *  exports.routes = function(kabam){
 *   kabam.app.get('/kittens',function(request,response){
 *     request.model.Cats.find({},function(err,cats){
 *       if(err) throw err;
 *       response.json(cats);
 *     });
 *   });
 *
 *   kabam.app.get('/dogs',function(request,response){
 *     request.model.Dogs.find({},function(err,dogs){
 *       if(err) throw err;
 *       response.json(dogs);
 *     });
 *   });
 * };
 * ```
 */
exports.routes = function(kabam){
  kabam.app.get('/kittens',function(request,response){
    request.model.Cats.find({},function(err,cats){
      if(err) throw err;
      response.json(cats);
    });
  });

  kabam.app.get('/dogs',function(request,response){
    request.model.Dogs.find({},function(err,dogs){
      if(err) throw err;
      response.json(dogs);
    });
  });
  kabam.app.get('/auth/linkedin', kabam.passport.authenticate('linkedin'), function (req, res) {
  });
  kabam.app.get('/auth/linkedin/callback', kabam.passport.authenticate('linkedin', { failureRedirect: '/' }),
    function (req, res) {
      res.redirect('/');
    });
};

/**
 * @ngdoc function
 * @name Plugin.listeners
 * @type {object}
 * @description
 * Object, that will be supplied as argument to kabam.extendListeners function
 * Field names are the vent types, values are function called against this events
 * @example
 * ```javascript
 *  exports.listeners = {
 *  'panic': function (panic) {
 *   console.log(alert);
 *  }
 * };
 * ```
 */
exports.listeners = {
  'alert': function (panic) {
    console.log(panic);
  }
};


