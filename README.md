@ngdoc overview
@name KabamKernel-index
@description

Kabam Kernel [![Build Status](https://travis-ci.org/mykabam/kabam-kernel.png?branch=master)](https://travis-ci.org/mykabam/kabam-kernel)
==========

Kabam core node.js application to be extended by plugins.
This is some sort of Application Generator / Bootstrap script to vendor [expressJS](http://expressjs.com/) applications with
high code reuse  from plugins. It is not a MVC framework or CMS. This is something more low level. This application include
expandable kernel module to apply mongoose model, app settings, middlewares and routes for application being created.


Important
=======

Without understanding how [express.js framework](http://expressjs.com/) operates, including

 - concept of [app](http://expressjs.com/api.html#express),
 - concept of [middleware](http://expressjs.com/api.html#middleware) and how [it can be used](http://webapplog.com/intro-to-express-js-parameters-error-handling-and-other-middleware/)
 - concept of chaining the middlewares (this is example of adding middleware to a chain [to count users online](http://expressjs.com/guide.html#users-online))
 - concept [route](http://expressjs.com/api.html#app.VERB)

this module is hard to understand. Please, read this information above before processing with this plugin.

Disclaimer
=======
Project is under development, if you build something on it, do update this module daily.
Review the documentation [http://ci.monimus.com/docs/#/api](http://ci.monimus.com/docs/#/api) - it have to be actual.
It is updated more often than README.md
This project policy implies, that `master` branch works always as documented
and completes unit tests successfully.
But it can have some new features, not listed in README.md.

**Official repos:**

 - [https://github.com/mykabam/kabam-kernel](https://github.com/mykabam/kabam-kernel) - main repo
 - [https://bitbucket.org/vodolaz095/kabamKernel](https://bitbucket.org/vodolaz095/kabamKernel) - read only backup repo, can be outdated

Concept of expandable expressJS application
================
Why do we need this plugin? Let us consider this expressJS application

```javascript

    var express = require('express')
      passport = require('passport');

  /*
   *initializing mongoose models (1)
   */

    var model = require('./model/models.js').init();

  /*
   *initializing passport.js strategies (2)
   */

    passport.use(/*some stuff*/);
    passport.use(/*some stuff*/);
    passport.use(/*some stuff*/);
    passport.serializeUser(function(user, done) {/*some stuff*/});
    passport.deserializeUser(function(obj, done) {/*some stuff*/});

  /*
   *seting application parameters (3)
   */

    var app = express();
    app.set('views', templateDirectory);
    app.set('view engine', 'html');
    app.set('layout', 'layout');
    app.engine('html', require('hogan-express'));

  /*
   *setting middlewares
   */

    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());

  /*
   *setting session middleware to use with passportJS (2)
   */

    app.use(express.session({ secret: 'keyboard cat' }));
    app.use(passport.initialize());
    app.use(passport.session());

  /*
   *custom middleware (4)
   */

    app.use(function(request,response,next){
      if(request.user){
        response.locals.myself = request.user;
      }
    });


  /*
   *inject mongoose models middleware (1)
   */

    app.use(function(request, response, next){
      request.model = model;
      next();
    });

  /*
   *router middleware
   */

    app.use(app.router);

  /*
   *setting error catcher middleware
   */

    app.use(function (err, req, res, next) {
     res.status(503);
     res.header('Retry-After', 360);
     res.send('Error 503. There are problems on our server. We will fix them soon!');
    });

  /*
   *setting routes (5)
   */

    app.get('/', function(req, res){
      res.send('hello world');
    });

  /*
   *starting application
   */

    app.listen(3000);

```

This application can be anything - blog platform, todo list, chat...
And if you closely examine all expressJS applications, you will find, that they usually have 5 hotspots, that
change from one to other application. This spots give the individuality to application, make it different from others.
This spots are

 1. Place to initialize mongoose models, and inject it to application routes controllers
 2. Place, where we tune the [passport.js](http://passportjs.org/) middleware - set up strategies and code to extract user profile from mongo database and add it to middleware chain
 3. Place to set application parameters - template engine, locals,
 4. Setting up custom middlewares in application chain
 5. Setting up application routes

 So, all expressJS application do differ on 5 points. And this is all, other code is shared between applications.
 In other works, we can create different applications by just tuning expressJS applications in this 5 points.
 So, maybe we need to automatize this procedure, create a class, that will vendor expressJS application by applying
 some settings functions on it in proper parts.

 This node module do this - it allows us to make transformations to expressJS application automatically.




Introduction
=======

Technically this is a Factory class to vendor [express.js](http://expressjs.com/) applications,
that can be easily extended by 6 mixin type functions.

0. `kabamKernel(configObj)` - create application object using [configuration object](https://github.com/mykabam/kabam-kernel/blob/master/example/config.json)
specified. The mandatory configObj fields are `"HOST_URL":"http://vvv.msk0.ru/"`, `"SECRET":"hammer on the keyboard"`,
and `"MONGO_URL":"mongodb://localhost/kabam_dev"`.

1. [extendCore('fieldName',function(config){...},'nameSpaceName')](http://ci.monimus.com/docs/#/api/kabam.extendCore) or
[extendCore('fieldName', 'someValue')](http://ci.monimus.com/docs/#/api/kabam.extendCore) - extend kernel object.
 You can call this function multiple times. Later this field/method can be called by `kabam.nameSpaceName.fieldName`. `nameSpaceName`
can be ommited, default value is `shared`.

2. [extendStrategy](http://ci.monimus.com/docs/#/api/kabam.extendStrategy) - extend authorization means of application by custom passportKS strategies module.

3. [extendModel(ModelName,function(mongoose, config){...})](http://ci.monimus.com/docs/#/api/kabam.extendModel) - extend build in mongoose models.

4. [extendApp(['development','staging','production','otherEnviroment'],function(core){...})](http://ci.monimus.com/docs/#/api/kabam.extendApp) - set global application parameters, for example
template [engines](http://expressjs.com/api.html#app.engine),
[locals](http://expressjs.com/api.html#app.locals)
and [other](http://expressjs.com/api.html#app-settings) settings.
First argument (array of enviroments) is OPTIONAL

5. [extendMiddleware(['development','staging','production','otherEnviroment'],'/middlewarePath',function(core){...})](http://ci.monimus.com/docs/#/api/kabam.extendMiddleware) -
 set application [middleware](http://expressjs.com/api.html#middleware).
This function can be executed multiple times, the middlewares applied are used in application in *order* they were issued by this function.
First argument (array of enviroments), and the second one (the path where to use middleware, the default is "/") are OPTIONAL

6. [extendRoutes(function(core){...})](http://ci.monimus.com/docs/#/api/kabam.extendRoutes) - add custom routes to application.
ExpressJS object of every routes request have functions of `request.kabamEmit`, `request.model`,`request.model.User`, `request.emitKabam`, custom models,
`request.redisClient`, and `request.user` provided by [passportjs](http://passportjs.org) middleware.


7. [usePlugin("kabam-plugin-foo") or usePlugin(pluginObj)](http://cd.monimus.com:8080/#/api/kabamKernel.usePlugin) -
use plugin as an object or [npm](https://npmjs.org/) package. See more on [how to create a plugin](https://github.com/mykabam/kabam-kernel#plugin-creating-manual) for details.

8. [start](http://ci.monimus.com/docs/#/api/kabam.start) - start the Kabam application in way desired.
9. [startCluster](http://ci.monimus.com/docs/#/api/kabam.startCluster) - start the Kabam application in way desired as a Cluster.

Plugins
=======
Each of plugins have working example, to see it in action, install plugin like this
```shell
    $ git clone git@github.com:mykabam/kabam_plugin_socket_io.git
    $ cd kabam_plugin_socket_io
    $ npm install
    $ npm start
```
If you have redis and mongodb running without password, every plugin have will start demonstration from the box.
If you have errors running plugin, upgrade your kernel or plugin modules.

 - [kabam_plugin_example](https://github.com/mykabam/kabam_plugin_example) [![Build Status](https://travis-ci.org/mykabam/kabam_plugin_example.png)](https://travis-ci.org/mykabam/kabam_plugin_example) demonstration plugin

 - [kabam_heroku](https://github.com/mykabam/kabam_heroku) - plugin to simplify deploy and configuring on [heroku cloud hosting](http://heroku.com).

 - [kabam-plugin-spine](https://github.com/mykabam/kabam-plugin-spine) [![Build Status](https://travis-ci.org/mykabam/kabam-plugin-spine.png)](https://travis-ci.org/mykabam/kabam-plugin-spine)  plugint that add task queue for application,
 based on  [Assemblage](https://github.com/pipedrive/assemblage) node module.

 - [kabam-plugin-hogan](https://github.com/mykabam/kabam-plugin-hogan) [![Build Status](https://travis-ci.org/mykabam/kabam-plugin-hogan.png?branch=master)](https://travis-ci.org/mykabam/kabam-plugin-hogan) - plugin to add support for [hogan-express template engine](https://github.com/vol4ok/hogan-express).

 - [kabam-plugin-notify-email](https://github.com/mykabam/kabam-plugin-notify-email) - plugin to notify users by email

 - [https://github.com/mykabam/kabam_plugin_gridfs](https://github.com/mykabam/kabam_plugin_gridfs) [![Build Status](https://travis-ci.org/mykabam/kabam_plugin_gridfs.png?branch=master)](https://travis-ci.org/mykabam/kabam_plugin_gridfs) - plugin to use gridfs

 - [https://github.com/mykabam/kabam_plugin_socket_io/](https://github.com/mykabam/kabam_plugin_socket_io) - plugin to notify users by socket.io events

[Plugin compatibility wiki](https://github.com/mykabam/kabam-kernel/wiki/Plugin-compatibility-guide)

Example
=======

[https://github.com/mykabam/kabam-kernel/blob/master/example/example.js](https://github.com/mykabam/kabam-kernel/blob/master/example/example.js)

What exposable parts the kabam instance do have?
=======

Kabam is a rather complicated object. In minimal installation it have this exposed internals:

1. `kabam` is a `event emmiter`. It can emit various types of events (for now it is `error` event, maybe some other events latter). For example

```javacript
    kabam.on('error',function(err){
       console.error(err);
    });
```

2. `kabam.app` - is a traditional [expressjs](http://express.js) application. We can bind it to listen to port for `HTTP` requests
in two ways

```javascript
    kabam.start(kabam.app.get('port'));
```

or

```javascript
    var http = require('http');
    kabam.start(http);
```

and for `https` server in this way

```javascript
    var https = require('https'),
    fs = require('fs'),
    options = {
        key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
        cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
    };
    kabam.start(https,options);
```



3. `kabam.mongoose` - is a [mongoose](https://npmjs.org/package/mongoose) instance, used by this applications.

4. `kabam.model` - is a object, that includes [mongoose models](http://mongoosejs.com/docs/guide.html), used by this application.
For now, there is `kabam.model.User` objects in it. But other models can be injected by `kabam.extendModel` function

5. `kabam.redisClient` - is a ready to use [redis](https://npmjs.org/package/redis) client used by application

When we add some pluggins, they can add more internals to kabam object.

Furthemore, kabam extends the [request](http://expressjs.com/api.html#req.params) object of ExpressJS application
with

```javascript
kabam.app.get('/someURI', function(request, response) {
  //request.user - passport.js authentication middleware user representation
  //request.model.users - mongoose model of users
  //request.redisClient - ready to work redis client
  //request.emitKabam('it works!'); //event emmiter, coupled to kabam event emmiter
});
```

The model of User
=======
This system use mongoose model to represent users. It have this global methods:

1. `kabam.model.findOneByLoginOrEmail(string,function(err,userFound){...})` - finds one user, that have `username` or `email`  equal to `string`
2. `kabam.model.findOneByApiKey(string,function(err,userFound){...})` - finds one user, that have `apiKey` equal to `string`
3. `kabam.model.getByRole(string,function(err,userFound){...})` - finds users, that have `role` of string
4. `kabam.model.findOneByKeychain('github', 23122, function(err,userFound){...})` - finds user, that has github profile if of 23122
5. `kabam.model.findOneByApiKeyAndVerify(apiKey,function(err,userFound){...})` - finds user with apiKey given and set his accout as verified
6. `kabam.model.findOneByApiKeyAndResetPassword(apiKey, password, function(err){...})` - resets password for account with api key given

Full description is published there:
[http://ci.monimus.com/docs/#/api/kabam.model.User](http://ci.monimus.com/docs/#/api/kabam.model.User)

Methods to one instance of class User

1. `user.getGravatar(size,type,rating)` - returns users gravatar - see [https://en.gravatar.com/site/implement/images/](https://en.gravatar.com/site/implement/images/)
2. `user.verifyPassword('passwordToCheck')` - returns true if password is correct, or false if password is wrong
3. `user.setPassword('newPassword',function(err){...})` - resets the users password, saves the instance to database
4. `user.invalidateSession(function(err){...})` - changes `apiKey` to random value, saves the instance to database
5. `user.hasRole('roleName')` - returns true if user have role of `roleName`, or false if user do not have the role
6. `user.grantRole('roleName',function(err){...})` - grant the user the new role of `roleName`, saves the instance to database
7. `user.revokeRole('roleName',function(err){...})` - revoke the role of `roleName` from user and  saves the instance to database
8. `user.notify(messageObj)` - notifyes the user with message of messageObj. Depending on the type of messageObj it is processed accordingly.

9. `user.saveProfile(profileObj,callback)` - save JSON formatted profile with any user related information, for example

```javascript
      user.saveProfile({
        'firstName':'John',
        'lastName':'Doe',
        'age':'32',
        'sex':'m'
      }
```

this data can be retrived from `user.profile`.

10. `user.setKeyChain(provider,id,callback);` - save oAuth provider cretentials to users profile. Example

```javascript
    user.setKeyChain('github', 23122, function(err){...};
```
will attach the github profile with id=23122 to users profile

11. `revokeKeyChain(provider,callback)` - opposite to 10.

Further documentation is published here [http://ci.monimus.com/docs/#/api/User](http://ci.monimus.com/docs/#/api/User)


There is plugin of [https://github.com/mykabam/kabam_plugin_notify_by_email](https://github.com/mykabam/kabam_plugin_notify_by_email)
that sends notifications as emails to user. There will be other plugins that can notify users by other means


Installation
=======

```shell
    $ git clone git@github.com:mykabam/kabam-kernel.git
    $ cd kabam-kernel
    $ npm install
```

Edit the example/config.json file with your favourite text editor.

```shell
    $ npm start
```

What you can do now with this application
=======
Open [http://localhost:3000/plugins](http://localhost:3000/) in browser to see the plugins installed.
Open [http://localhost:3000/auth/google](http://localhost:3000/auth/google) in browser to try to login via Google Account
Open [http://localhost:3000/my](http://localhost:3000/my) to see you profile

Developer's Note
================

`DO NOT CONTRIBUTE TO BRANCH MASTER PLEASE!!!`

CREATE A FEATURE BRANCH INSTEAD!

Run jshint with:

```shell
    $ grunt jshint
```

Run unit tests with:

```shell
    $ grunt test
```

or

```shell
    $ npm test
```

[![Build Status](https://travis-ci.org/mykabam/kabam-kernel.png?branch=master)](https://travis-ci.org/mykabam/kabam-kernel)

how to create a plugin
=======

This is typical plugin code. It is placed there
[https://github.com/mykabam/kabam_plugin_example](https://github.com/mykabam/kabam_plugin_example)

*Important* - when you create plugin, the `extendApp`, `extendMiddleware` APPLIES to all environments!
Furthermore, `extendMiddleware` binds to route '/'

Lifecycle of kabamKernel module and how can we extend it
=======
*Firstly*, the *core* module in extending functions are THE SAME instance of kabamKernel application.
And every call of extending functions shedule some customization for this application.

I think i will post a bad example, and explain, why this is bad

```javascript
kabam.extendCore = function(core) {
  core.sum = function(a, b) {
    return (a + b);
  }
  //set expressJS route
  core.app.get('/someUrl', function(req, res) {
    res.send('Hello!');
  });
  //set middleware
  core.app.use('/someUrl', function(req, res, next) {
    res.setHeader('x-bad-practice', 'yea!');
    next();
  });
}
```

And this code will be erroneous, because it violates the desired lifespan of application.
Because on stage of extending core, there is no core.app variable.

This is the way of things it is intended to work
When you call the `extendCore('fieldName',function(config){...})`, you can add global core functions and variables,
but not anything other touching the application, middlewares or routes.
In code it is called right after initializing [mongoose routes](https://github.com/mykabam/kabam-kernel/blob/master/index.js#L195)
core have event emmiter capabilities `kabam.emit`,`kabam.on`, `kabam.redisClient`, and `kabam.model.User`, `kabam.model.Documents` (exposed as mongoose schemas).
Nothing more!

When you call `extendModel(ModelName,function(mongoose, config){...})` you get all the enviroment created after calling
`extendCore(function(core){...})`.


When you call `extendApp(function(core){...})`, you can set global application parameters, for example
template [engines](http://expressjs.com/api.html#app.engine), [locals](http://expressjs.com/api.html#app.locals)
and [other](http://expressjs.com/api.html#app-settings) settings.
In code it is called [after settng logging middleware and port](https://github.com/mykabam/kabam-kernel/blob/master/index.js#L236).
You can set any application parameter you want, you have full kabam core internalls at your disposal
`kabam.emit`,`kabam.on`, `kabam.redisClient`, and `kabam.model.User`, `kabam.model.Documents` and custom models from calling `extendModel`.

When you call `extendMiddleware(function(core){...})`, you can set app middlewares.
They are [called]((https://github.com/mykabam/kabam-kernel/blob/master/index.js#L283) after
[setting default exposed internals middleware](https://github.com/mykabam/kabam-kernel/blob/master/index.js#L271) and before
[setting error handlers middlewares](https://github.com/mykabam/kabam-kernel/blob/master/index.js#L283).

So, you have the full power of core internals - (`emit`,`on`), `redisClient`, and `model.Users`, `model.Documents`
and exposed internals middleware - where expressJS object of request have functions of `request.kabamEmit`,
`request.model`,`request.model.Users`,`request.model.Documents`, custom models,`request.redisClient`, and `request.user` provided
by passportjs middleware.

When you call `extendRoutes(function(core){})`, you can set the application routes and verbs for them.
This is done after defining [router middleware]((https://github.com/mykabam/kabam-kernel/blob/master/index.js#L307) )
(the one that bind nodejs functions to URIs) and before the
[setting up the default routes for Users and documents](https://github.com/mykabam/kabam-kernel/blob/master/index.js#L313)
and routes for passport.js authentication.

It is worth saying, that you also have expressJS object of every route defined to  have functions of `request.kabamEmit`,
`request.MODEL`,`request.MODEL.Users`,`request.MODEL.Documents`, custom models,`request.redisClient`, and `request.user` provided
by [passportjs](http://passportjs.org) middleware.


Responsibility guidelines
================
Every kabam plugin and package has the responsible developer. His duties are

- Maintain the package - fix and found bugs from upgrading modules included or nodejs version change
- React on bug reports
- Accept/deny pull request.

The `Push` and `npm publish` privilege is the right of the `Responsible developer`, but the `fork` - is for everybody.

Responsible developer for this package is  [Anatolij Ostroumov](https://github.com/vodolaz095)