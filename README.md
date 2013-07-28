mwc_core
========

MyWebClass core node.js application to be extended by loaded automatically middleware plugins.
Technically this is a Factory class to vendor [express.js](http://expressjs.com/) applications, 
that can be easily extended by 6 functions.

0. Constructor - create application object using configuration object.

1. `extendCore(function(core){...})` - extend object created, including expressJS application
and some other modules. You can call this function multiple times

2. `extendModel(ModelName,function(mongoose, config){...})` - extend build in mongoose models.

3. `extendApp(['development','staging','production','otherEnviroment'],function(core){...})` - set global application parameters, for example
template [engines](http://expressjs.com/api.html#app.engine), 
[locals](http://expressjs.com/api.html#app.locals) 
and [other](http://expressjs.com/api.html#app-settings) settings.
First argument (array of enviroments) is OPTIONAL

4. `extendMiddlewares(['development','staging','production','otherEnviroment'],'/middlewarePath',function(core){...})` - set application
[middleware](http://expressjs.com/api.html#middleware).
This function can be executed multiple times, the middlewares applied are used in application in *order* they were issued by this function.
First argument (array of enviroments), and the second one (the path where to use middleware, the default is "/") are OPTIONAL

5. `extendRoutes(function(core){...})` - add custom routes to application

6. `loadPlugin("mwc_plugin_foo")` or `loadPlugin(pluginObj)` - load plugin as object or as a installed [npm](https://npmjs.org/) plugin by name
See [Plugin creating manual](https://github.com/mywebclass/mwc_core#plugin-creating-manual) for details



Plugins
=======

 - [mwc_plugin_example](https://github.com/mywebclass/mwc_plugin_example) [![Build Status](https://travis-ci.org/mywebclass/mwc_plugin_example.png)](https://travis-ci.org/mywebclass/mwc_plugin_example) demonstration plugin
 
 - [mwc_plugin_spine](https://github.com/mywebclass/mwc_plugin_spine) [![Build Status](https://travis-ci.org/mywebclass/mwc_plugin_spine.png)](https://travis-ci.org/mywebclass/mwc_plugin_spine)  plugint that add task queue for application,
 based on  [Assemblage](https://github.com/pipedrive/assemblage) node module.

 - [mwc_plugin_hogan_express](https://github.com/mywebclass/mwc_plugin_hogan_express) [![Build Status](https://travis-ci.org/mywebclass/mwc_plugin_hogan_express.png?branch=master)](https://travis-ci.org/mywebclass/mwc_plugin_hogan_express) - plugin to add support for [hogan-express template engine](https://github.com/vol4ok/hogan-express).

 - [https://github.com/mywebclass/mwc_plugin_notify_by_email](https://github.com/mywebclass/mwc_plugin_notify_by_email) - plugin to notify users by email

 - [https://github.com/mywebclass/mwc_plugin_gridfs](https://github.com/mywebclass/mwc_plugin_gridfs) - plugin to use gridfs

[Plugin compatibility wiki](https://github.com/mywebclass/mwc_core/wiki/Plugin-compatibility-guide)

Example
=======

```javascript
var mwcCore = require('./../index.js');
//setting up the config
var MWC = new mwcCore(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);

//we extend the mwc_core instance
MWC.extendCore(function(core) {
  //starting coocoo clock)
  setInterval(function() {
    core.emit('Coocoo!', 'Time now is ' + (new Date().toLocaleTimeString()));
  }, 5000);
  //adding custom function to MWC module
  core.getSum = function(a, b) {
    return a + b;
  };
});

//set global lever variables for expressJS application
MWC.extendApp(['development', 'staging'], function(core) {
  core.app.set('TempVar', '42');
});


MWC.extendModel('Cats', function(mongoose, config) {
  var CatsSchema = new mongoose.Schema({
    'nickname': String
  });

  CatsSchema.index({
    nickname: 1
  });

  return mongoose.model('cats', CatsSchema);
});

//set middleware for development and staging enviroments
MWC.extendMiddlewares(['development', 'staging'], function(core) {
  return function(req, res, next) {
    res.setHeader('X-Production', 'NO!');
    next();
  };
});
//we add some routes
MWC.extendRoutes(
  function(core) {
    core.app.get('/', function(req, res) {
      var authByGoogleString = (req.user) ? '<li><a href="/my">See your profile</a></li>' : '<li><a href="/auth/google">Auth by google</a></li>';

      res.send('<html>' +
        '<head>MyWebClass Core Example</head>' +
        '<body>' +
        '<p>TempVar is ' + core.app.get('TempVar') + '</p>' +
        '<p>Hello, friend! You can do this things:</p><ul>' +
        '<li>See current <a href="/time">time</a>.</li>' +
        '<li>See <a href="/team">team</a> on this server.</li>' +
        '<li>See all <a href="/redis">redis</a> keys stored.</li>' +
        authByGoogleString +
        '<li>See this server <a href="/config">parameters</a>.</li>' +
        '<li>See users <a href="/api/users">api endpoint</a> on this server.</li>' +
        '<li>See <a href="/plugins">plugins</a> installed on this server.</li>' +
        '<li><a href="/honeypot">Notify</a> admin of your presense.</li>' +
        '<li>See this application <a href="https://github.com/mywebclass/mwc_plugin_example">source on Github</a></li>' +
        '</ul></body>' +
        '</html>');
    });

    //we use Mongoose Model in this route
    core.app.get('/team', function(request, response) {
      request.MODEL.Users.find({
        active: 1
      }, function(err, users) {
        if (err) {
          throw err;
        }
        response.json({
          'Team': users
        });
      });
    });
    //we use exposed Redis client. In a rather stupid way.
    core.app.get('/redis', function(request, response) {
      request.redisClient.keys('*', function(err, keys) {
        response.json(keys);
      });
    });

    //making mousetrap - when user visits this url, MWC emmits the event
    core.app.get('/honeypot', function(request, response) {
      request.emitMWC('honeypot accessed', 'Somebody with IP of ' + request.ip + ' accessed the honeypot');
      response.send('Administrator was notified about your actions!');
    });

    core.app.get('/kittens', function(request, response) {
      request.MODEL.Cats.find({}, function(err, cats) {
        if (err) throw err;
        response.json(cats);
      });
    });

    core.app.get('/dogs', function(request, response) {
      request.MODEL.Dogs.find({}, function(err, dogs) {
        if (err) throw err;
        response.json(dogs);
      });
    });

  }
);

//injecting plugin as an object
MWC.usePlugin({
  'extendCore': null, //can be ommited
  'extendModel': {
    'Dogs': function(mongoose, config) {
      var DogsSchema = new mongoose.Schema({
        'nickname': String
      });
      DogsSchema.index({
        nickname: 1
      });
      return mongoose.model('dogs', DogsSchema);
    }
  },
  'extendApp': null, //can be ommited
  'extendMiddlewares': null, //can be ommited
  'extendRoutes': function(core) {
    core.app.get('/newPlugin', function(req, res) {
      res.send('New plugin is installed as object');
    });
  }
});

try {
  //injecting plugin as an name of installe npm package!
  MWC.usePlugin('mwc_plugin_example');
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.error('mwc_plugin_example is not installed.');
  }
}


//api/user works from box
//api/documents works from box

//binding application to port
MWC.listen(3000);

//testing custom function defined on line 10
console.log('Sum of 2 and 2 is ' + MWC.getSum(2, 2));

//listening of MWC events. 'Coocoo!' is emmited by mwc_plugin_example every 5 seconds
MWC.on('Coocoo!', function(message) {
  console.log('Coocoo! Coocoo! ' + message);
});

MWC.on('honeypot accessed', function(message) {
  console.log('Attention! Somebody tries to hack us! ' + message);
});

setTimeout(function() {
  MWC.MODEL.Cats.create({
    nickname: 'Chubais'
  }, function(err, cat) {
    if (err) throw err;
    if (cat) {
      console.log('Skoro tolko koshki rodyatsya!');
      console.log('Happy birthday, ' + cat.nickname);
    }
  });
}, 5000);

setTimeout(function() {
  MWC.MODEL.Dogs.create({
    nickname: 'Laika'
  }, function(err, dog) {
    if (err) throw err;
    if (dog) {
      console.log('Happy birthday, ' + dog.nickname);
    }
  });
}, 4000);
```

What exposable parts the MWC instance do have?
=======

MWC is a rather complicated object. In minimal installation it have this exposed internals:

1. `MWC` is a `event emmiter`. It can emit various types of events (for now it is `error` event, maybe some other events latter). For example

```javacript
    MWC.on('error',function(err){
       console.error(err);
    });
```

2. `MWC.app` - is a traditional [expressjs](http://express.js) application. We can bind it to listen to port for `HTTP` requests
in two ways

```javascript
    MWC.listen(MWC.app.get('port'));
```

or

```javascript
    var http = require('http');
    MWC.listen(http);
```

and for `https` server in this way

```javascript
    var https = require('https'),
    fs = require('fs'),
    options = {
        key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
        cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
    };
    MWC.listen(https.createcreateServer(options,MWC.app));
```



3. `MWC.mongoose` - is a [mongoose](https://npmjs.org/package/mongoose) instance, used by this applications.

4. `MWC.MODEL` - is a object, that includes [mongoose models](http://mongoosejs.com/docs/guide.html), used by this application.
For now, there is `MWC.MODEL.Users` and `MWC.MODEL.Documents` objects in it

5. `MWC.redisClient` - is a ready to use [redis](https://npmjs.org/package/redis) client used by application

When we add some pluggins, they can add more internals to MWC object.

Furthemore, MWC extends the [request](http://expressjs.com/api.html#req.params) object of ExpressJS application
with

```javascript
MWC.app.get('/someURI', function(request, response) {
  //request.user - passport.js authentication middleware user representation
  //request.MODEL.users
  //request.MODEL.documents
  //request.redisClient
  //request.emitMWC('it works!'); //event emmiter, coupled to MWC event emmiter
});
```

The model of User
=======
This system use mongoose model to represent users. It have this methods.

1. `MWC.MODEL.findOneByLoginOrEmail(string,function(err,userFound){...})` - finds one user, that have `username` or `email`  equal to `string`
2. `MWC.MODEL.findOneByApiKey(string,function(err,userFound){...})` - finds one user, that have `apiKey` equal to `string`
3. `MWC.MODEL.getByRole(string,function(err,userFound){...})` - finds users, that have `role` of string

Methods to one instance of class User

1. `user.getGravatar(size,type,rating)` - returns users gravatar - see [https://en.gravatar.com/site/implement/images/](https://en.gravatar.com/site/implement/images/)
2. `user.verifyPassword('passwordToCheck')` - returns true if password is correct, or false if password is wrong
3. `user.setPassword('newPassword',function(err){...})` - resets the users password, saves the instance to database
4. `user.invalidateSession(function(err){...})` - changes `apiKey` to random value, saves the instance to database
5. `user.hasRole('roleName')` - returns true if user have role of `roleName`, or false if user do not have the role
6. `user.grantRole('roleName',function(err){...})` - grant the user the new role of `roleName`, saves the instance to database
7. `user.revokeRole('roleName',function(err){...})` - revoke the role of `roleName` from user and  saves the instance to database
8. `user.notify(messageObj)` - notifyes the user with message of messageObj. Depending on the type of messageObj it is processed accordingly.
There is plugin of [https://github.com/mywebclass/mwc_plugin_notify_by_email](https://github.com/mywebclass/mwc_plugin_notify_by_email)
that sends SOME notifications as emails to user. There will be other plugins that can notify users by other means





Installation
=======

```shell
    $ git clone git@github.com:mywebclass/mwc_core.git
    $ cd mwc_core
    $ npm install
```

Edit the example/config.json file with your favourite text editor.

```shell
    $ node example/populate_database.js
    $ npm start
```

What you can do now with this application
=======
Open [http://localhost:3000/plugins](http://localhost:3000/) in browser to see the plugins installed.
Open [http://localhost:3000/auth/google](http://localhost:3000/auth/google) in browser to try to login via Google Account
Open [http://localhost:3000/my](http://localhost:3000/my) to see you profile

Developer's Note
================

CONTRIBUTE TO BRANCH `dev` ONLY PLEASE!!!

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

[![Build Status](https://travis-ci.org/mywebclass/mwc_core.png?branch=master)](https://travis-ci.org/mywebclass/mwc_core)

Plugin creating manual
=======

This is typicale plugin code. It is placed there
[https://github.com/mywebclass/mwc_plugin_example](https://github.com/mywebclass/mwc_plugin_example)

*Important* - when you create plugin, the `extendApp`, `extendMiddlewares` APPLIES to all enviroments!
Furthemore, `extendMiddlewares` binds to route '/'

```javascript
var os = require('os');

exports.extendCore = function(core) {
  //some other Cocoo clock
  setInterval(function() {
    core.emit('Coocoo!', 'Dzin!');
  }, 5000);
};

exports.extendApp = function(core) {
  core.app.set('var1', "42");
};

exports.extendMiddlewares = function(core) {
  return function(request, response, next) {
    response.setHeader('X-MWC-PLUGIN_EXAMPLE!', 'THIS ROCKS!');
    next();
  }
};

exports.extendRoutes = function(core) {
  core.app.get('/time', function(request, response) {
    response.send('Current time is ' + (new Date().toLocaleString()));
  });


  core.app.get('/config', function(request, response) {
    response.json({
      'current_time': (new Date().toLocaleString()),
      'NODE_ENV': process.env.NODE_ENV,
      'OS': {
        'hostname': os.hostname(),
        'arch': os.arch(),
        'type': os.type(),
        'platform': os.platform(),
        'release': os.release(),
        'NodeJS version': process.version
      }
    });
  });

  //we use Mongoose Model in this route
  core.app.get('/team', function(request, response) {
    request.MODEL.Users.find({
      active: 1
    }, function(err, users) {
      if (err) throw err;
      response.json({
        'Team': users
      });
    });
  });
  //we use exposed Redis client. In a rather stupid way.
  core.app.get('/redis', function(request, response) {
    request.redisClient.keys('*', function(err, keys) {
      response.json(keys);
    });
  });

  //making mousetrap - when user visits this url, MWC emmits the event
  core.app.get('/honeypot', function(request, response) {
    request.emitMWC('honeypot accessed', 'Somebody with IP of ' + request.ip + ' accessed the honeypot');
    response.send('Administrator was notified about your actions!');
  });
};
```

Lifecycle of mwc_core module and how can we extend it
=======
*Firstly*, the *core* module in extending functions are THE SAME instance of mwcCore application.
And every call of extending functions shedule some customization for this application.

I think i will post a bad example, and explain, why this is bad

```javascript
MWC.extendCore = function(core) {
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

And this code will be erroneus, because it violates the desired lifespan of application.
Because on stage of extending core, there is no core.app variable.

This is the way of things it is intended to work
When you call the `extendCore(function(core){...})`, you can add global core functions and variables,
but not anything other touching the application, middlewares or routes.
In code it is called right after initializing [mongoose routes](https://github.com/mywebclass/mwc_core/blob/master/index.js#L195)
core have event emmiter capabilities `MWC.emit`,`MWC.on`, `MWC.redisClient`, and `MWC.MODEL.Users`, `MWC.MODEL.Documents` (exposed as mongoose schemas).
Nothing more!

When you call `extendModel(ModelName,function(mongoose, config){...})` you get all the enviroment created after calling
`extendCore(function(core){...})`.


When you call `extendApp(function(core){...})`, you can set global application parameters, for example
template [engines](http://expressjs.com/api.html#app.engine), [locals](http://expressjs.com/api.html#app.locals)
and [other](http://expressjs.com/api.html#app-settings) settings.
In code it is called [after settng logging middleware and port](https://github.com/mywebclass/mwc_core/blob/master/index.js#L236).
You can set any application parameter you want, you have full MWC core internalls at your disposal  
`MWC.emit`,`MWC.on`, `MWC.redisClient`, and `MWC.MODEL.Users`, `MWC.MODEL.Documents` and custom models from calling `extendModel`.

When you call `extendMiddlewares(function(core){...})`, you can set app middlewares.
They are [called]((https://github.com/mywebclass/mwc_core/blob/master/index.js#L283) after
[setting default exposed internals middleware](https://github.com/mywebclass/mwc_core/blob/master/index.js#L271) and before
[setting error handlers middlewares](https://github.com/mywebclass/mwc_core/blob/master/index.js#L283).

So, you have the full power of core internals - (`emit`,`on`), `redisClient`, and `MODEL.Users`, `MODEL.Documents`
and exposed internals middleware - where expressJS object of request have functions of `request.mwcEmit`,
`request.MODEL`,`request.MODEL.Users`,`request.MODEL.Documents`, custom models,`request.MODEL.redisClient`, and `request.user` provided
by passportjs middleware.

When you call `extendRoutes(function(core){})`, you can set the application routes and verbs for them.
This is done after defining [router middleware]((https://github.com/mywebclass/mwc_core/blob/master/index.js#L307) )
(the one that bind nodejs functions to URIs) and before the
[setting up the default routes for Users and documents](https://github.com/mywebclass/mwc_core/blob/master/index.js#L313)
and routes for passport.js authentication.

It is worth saying, that you also have expressJS object of every route defined to  have functions of `request.mwcEmit`,
`request.MODEL`,`request.MODEL.Users`,`request.MODEL.Documents`, custom models,`request.MODEL.redisClient`, and `request.user` provided
by [passportjs](http://passportjs.org) middleware.


