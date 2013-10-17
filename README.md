Kabam Kernel [![Build Status](https://travis-ci.org/mykabam/kabam-kernel.png?branch=master)](https://travis-ci.org/mykabam/kabam-kernel)
============

Kabam-Kernel is an application container / factory for creating applications using [MEAN stack](http://blog.mongodb.org/post/49262866911/the-mean-stack-mongodb-expressjs-angularjs-and)

It provides an interface for creating reusable, decoupled components that extend application functionality.
By dividing your application into such components you achieve greater testability and higher configurability.
The project also includes built-in components for commonly used user management functionality such as sign up,
sign in and OAuth integration.

Disclaimer
==========
The project is under active development. Things break often and core interfaces aren't stabilized yet.


Example
=======

```javascript
var kabamKernel = require('kabam-kernel');
// instantiate kabam-kernel providing config object
var kernel = kabamKernel({FOO:"BAR"});
kernel.usePlugin({
    routes: function(kernel){
        kernel.app.get('/', function(req, res){
            res.send('Hello World');
        }
    }
})

// start listening on 3000 port by default
kernel.start();
```

This might seem as a lot of code for the Hello World, but Kabam-Kernel can be used for much more than just extending
express.js routes.


Ideology
=====================
There were two main reasons behind creating Kabam-Kernel:

- ability to easily develop, configure and test certain pieces of application functionality in a group of developers without breaking stuff.
- ability to reuse certain modules in many application or creating instances of the same application but with different modules (for example REST and WebSocket interfaces with the same business logic)

So given that the instantiation of majority of web applications can be narrowed down to 5 phases:

1. Configuration
- Instantiation of services (DB connections, redis, etc...)
- Instantiation of the app itself
- Middleware configuration
- Registering routes with business logic itself

We created an interface for developing Kabam-Kernel plugins which allows to hook up to all the phases above and extend the app.

Complete plugin example
-----------------------

Lets say we have a file named `foo.js` with the following content:

``` javascript
var redis = require('redis');
// name of the plugin
exports.name = 'foo-plugin';
// services that will be added to the kernel, in this case we add redis client
exports.core = {
	redis: redis.createClient(),
	someNumber: 42
}
// a plugin can also add models to the application
exports.model = {
  Cats: function (mongoose, config) {
    var CatsSchema = new mongoose.Schema({
      'nickname': String
    });

    CatsSchema.index({
      nickname: 1
    });
    return CatsSchema;
  }
}
// extend express js application
exports.app = function (kernel) {
  kernel.app.set('someValue', 42);
};

// add passport.js strategy
exports.strategy = function (kernel) {
  return new LinkedInStrategy({
  	// reading config values from kernel.config 
    consumerKey: kernel.config.passport.LINKEDIN_API_KEY,
    consumerSecret: kernel.config.passport.LINKEDIN_SECRET_KEY,
    callbackURL: kernel.config.hostUrl + 'auth/linkedin/callback'
  }, function (token, tokenSecret, profile, done) {
    var email = profile.emails[0].value;
    // using of the built-in models
    kernel.model.User.linkEmailOnlyProfile(email, done);
  });
};

// a list of middleware components that will be added to the app
exports.middleware = [
  function (kernel) {
    return function (request, response, next) {
      request.model.Cats.count({name: 'Grumpy'}, function (err, numberOfCats) {
      	// using someNumber that were added to the kernel before
        if (numberOfCats > kernel.someNumber) {
          request.getSum = kernel.getSum; //DI of core methods or values
          next();
        } else {
          response.send(500, 'There is not enough cats called "Grumpy" to run this application!');
        }
      });
    };
  }
];

// configure routes for the express.js application
exports.routes = function(kabam){
  kabam.app.get('/kittens',function(request,response){
    kabam.model.Cats.find({},function(err,cats){
      if(err) throw err;
      response.json(cats);
    });
  });

  // adding routes fo the passport strategy configured above
  kabam.app.get('/auth/linkedin', kabam.passport.authenticate('linkedin'));
  kabam.app.get('/auth/linkedin/callback', kabam.passport.authenticate('linkedin', { failureRedirect: '/' }),
    function (req, res) {
      res.redirect('/');
    });
};
```

We can now extend our app by including the plugin above with one simple line of code

```javascript
kernel.usePlugin(require('foo'));
```

API Documentation
=================
Current API documentation for the Kabam-Kernel and core plugins can be found at [http://cd.monimus.com:8080/](http://cd.monimus.com:8080/)

Kabam-Kernel instance methods
=============================

1. [extendCore('fieldName',function(config){...})](http://cd.monimus.com:8080/#/api/kabamKernel.extendCore) or
[extendCore('fieldName', 'someValue')](http://cd.monimus.com:8080/#/api/kabamKernel.extendCore)  or 
[extendCore(function(core){...})](http://cd.monimus.com:8080/#/api/kabamKernel.extendCore)- extend kernel object.
Extends kernel with new services.

2. [extendStrategy](http://cd.monimus.com:8080/#/api/kabamKernel.extendStrategy) - extend authorization means of application by custom Passport.js strategies module.

3. [extendModel(ModelName,function(mongoose, config){...})](http://cd.monimus.com:8080/#/api/kabamKernel.extendModel) - extend application mongoose models.

4. [extendApp(['development','staging','production','otherEnviroment'],function(core){...})](http://cd.monimus.com:8080/#/api/kabamKernel.extendApp) - set global application parameters, for example
template [engines](http://expressjs.com/api.html#app.engine),
[locals](http://expressjs.com/api.html#app.locals)
and [other](http://expressjs.com/api.html#app-settings) settings.
First argument (array of enviroments) is OPTIONAL

5. [extendMiddleware(['development','staging','production','otherEnviroment'],'/middlewarePath',function(core){...})](http://cd.monimus.com:8080/#/api/kabamKernel.extendMiddleware) -
 set application [middleware](http://expressjs.com/api.html#middleware).
This function can be executed multiple times, the middleware components applied in *order* they were declared by this function.
First argument (array of enviroments), and the second one (the path where to use middleware, the default is "/") are OPTIONAL

6. [extendRoutes(function(core){...})](http://cd.monimus.com:8080/#/api/kabamKernel.extendRoutes) - add custom routes to application.

7. [usePlugin("kabam-plugin-foo") or usePlugin(pluginObj)](http://cd.monimus.com:8080/#/api/kabamKernel.usePlugin) -
use plugin as an object or [npm](https://npmjs.org/) package. See more on [how to create a plugin](https://github.com/mykabam/kabam-kernel#plugin-creating-manual) for details.

8. [start](http://cd.monimus.com:8080/#/api/kabam.start) - start the Kabam application in way desired.
9. [startCluster](http://cd.monimus.com:8080/#/api/kabam.startCluster) - start the Kabam application in way desired as a Cluster.

