exports.name = 'pluginExample';
exports.dependencies = ['mwc_plugin_foo','mwc_plugin_bar']; //we throw error it this plugins are not loaded in application

exports.extendCore = {
  'parameterOne': 1,
  'parameterTwo': [1, 2, 3, 4, 5],
  'parameterThree': {},
  'parameterFour': function () {
    return this.parameterOne+this.parameterTwo[0];
  },
  'getSum': function (a, b){
    return a + b;
  }
};


exports.extendModel = {
  'Cats': function (mongoose, config) {
    var CatsSchema = new mongoose.Schema({
      'nickname': String
    });

    CatsSchema.index({
      nickname: 1
    });
    return mongoose.model('cats', CatsSchema);
  },

  'Dogs': function (mongoose, config) {
    var DogsSchema = new mongoose.Schema({
      'nickname': String
    });

    DogsSchema.index({
      nickname: 1
    });

    return mongoose.model('Dogs', DogsSchema);
  }
};

//we do it for all application enviroments
//app - is a expressJS application. it turned out that we do not need core here...
//config - is a current mwc config object
exports.extendApp = function (app, config) {
  app.set('someValue',42);
};

var LinkedInStrategy = require('passport-linkedin').Strategy;

//sorry, only one(!) passportJS strategy per plugin!
exports.extendStrategy = {
  'strategy': function (core) {
    return new LinkedInStrategy({
      consumerKey: core.config.passport.LINKEDIN_API_KEY,
      consumerSecret: core.config.passport.LINKEDIN_SECRET_KEY,
      callbackURL: core.config.hostUrl + 'auth/linkedin/callback'
    }, function (token, tokenSecret, profile, done) {
      console.log('==============');
      console.log(profile);
      console.log('==============');
      var email = profile.emails[0].value;
      if (email) {
        core.model.Users.processOAuthProfile(email, done);
      } else {
        return done(new Error('There is something strange instead of user profile'));
      }
    });
  },
  'routes': function (passport, core) {
    core.app.get('/auth/linkedin', passport.authenticate('linkedin'), function (req, res) {
    });
    core.app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/' }),
      function (req, res) {
        res.redirect('/');
      });
  }
};

//the most hard to understand function
//because middleware conception is tricky and it do need the core object, for example,
// in this way or maybe in some other way. But it do need the core!!!
//for simplicity of code of plugin all middlewares are setted to all enviroments and are mounted to path /
exports.extendMiddleware = [
  function (core) {
    return function (request, response, next) {
      request.model.Cats.count({name: 'Grumpy'}, function (err, numberOfCats) {
        if (numberOfCats > core.parameterOne) {

          request.getSum = core.getSum; //DI of core methods or values

          next();
        } else {
          response.send(500, 'There is not enough cats called "Grumpy" to run this application!');
        }
      });
    }
  },
  function (core) {
    return function (request, response, next) {
      request.model.Dogs.count({name: 'Strelka'}, function (err, numberOfDogs) {
        if (numberOfDogs > core.parameterOne) {

          request.getSum = core.getSum; //DI of core methods or values

          next();
        } else {
          response.send(500, 'There is not enough Dogs called "Strelka" to run this application!');
        }
      });
    }
  }
];

//extending routes
//maybe we have injected all we need in routes parameters in extendMiddleware
//and we can bind routes to application instead of core...

exports.extendRoutes = function(core){
  core.app.get('/kittens',function(request,response){
    request.model.Cats.find({},function(err,cats){
      if(err) throw err;
      response.json(cats);
    });
  });

  core.app.get('/dogs',function(request,response){
    request.model.Dogs.find({},function(err,dogs){
      if(err) throw err;
      response.json(dogs);
    });
  });
};

//custom listeners to core events
exports.extendListeners('alert',function(alert){
  console.log(alert);
});


