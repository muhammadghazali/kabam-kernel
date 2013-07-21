mwc_core
========

MyWebClass core node.js application to be extended by loaded automatically middleware plugins

Pluggable modules runned
=======

Right now there is only one plugable module - [https://github.com/mywebclass/mwc_plugin_example](https://github.com/mywebclass/mwc_plugin_example).

It is binded to [http://localhost:3000/example](http://localhost:3000/example) route.

The list of active plugins can be viewed here [http://localhost:3000/example](http://localhost:3000/example)

*Example*:

```javascript

    var mwcCore = require('./../index.js');
    //setting up the config
    var MWC = new mwcCore(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);

    //we extend the mwc_core instance
    MWC.extendCore(function (core) {
      //starting coocoo clock)
      setInterval(function () {
        core.emit('Coocoo!', 'Time now is ' + (new Date().toLocaleTimeString()));
      }, 5000);
      //adding custom function to MWC module
      core.getSum = function (a, b) {
        return a + b;
      };
    });

    //set global lever variables for expressJS application
    MWC.setAppParameters(['development', 'staging'], function (core) {
      core.app.set('TempVar', '42');
    });

    //set middleware for development and staging enviroments
    MWC.setAppMiddlewares(['development', 'staging'], function (core) {
      return function (req, res, next) {
        res.setHeader('X-Production', 'NO!');
        next();
      };
    });
    //we add some routes
    MWC.extendAppRoutes(
      function (core) {
        core.app.get('/', function (req, res) {
          var authByGoogleString = (req.user)?'<li><a href="/my">See your profile</a></li>':'<li><a href="/auth/google">Auth by google</a></li>';

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
        core.app.get('/team', function (request, response) {
          request.MODEL.Users.find({active: 1}, function (err, users) {
            if (err) {
              throw err;
            }
            response.json({'Team': users});
          });
        });
        //we use exposed Redis client. In a rather stupid way.
        core.app.get('/redis', function (request, response) {
          request.redisClient.keys('*', function (err, keys) {
            response.json(keys);
          });
        });

        //making mousetrap - when user visits this url, MWC emmits the event
        core.app.get('/honeypot', function (request, response) {
          request.emitMWC('honeypot accessed', 'Somebody with IP of ' + request.ip + ' accessed the honeypot');
          response.send('Administrator was notified about your actions!');
        });

      }
    );

    //injecting plugin as an object
    MWC.usePlugin({
      'extendCore': null, //can be ommited
      'setAppParameters': null, //can be ommited
      'setAppMiddlewares': null, //can be ommited
      'extendAppRoutes': function (core) {
        core.app.get('/newPlugin', function (req, res) {
          res.send('New plugin is installed as object');
        });
      }
    });

    //injecting plugin as an name of installe npm package!
    MWC.usePlugin('mwc_plugin_example');


    //api/user works from box
    //api/documents works from box

    //binding application to port
    MWC.listen(3000);

    //testing custom function defined on line 10
    console.log('Sum of 2 and 2 is ' + MWC.getSum(2, 2));

    //listening of MWC events. 'Coocoo!' is emmited by mwc_plugin_example every 5 seconds
    MWC.on('Coocoo!', function (message) {
      console.log('Coocoo! Coocoo! ' + message);
    });

    MWC.on('honeypot accessed', function (message) {
      console.log('Attention! Somebody tries to hack us! ' + message);
    });





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
    MWC.app.get('/someURI',function(request,response){
       //request.MODEL.users
       //request.MODEL.documents
       //request.redisClient
       //request.emitMWC('it works!'); //event emmiter, coupled to MWC event emmiter
    });
```

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
Open [http://localhost:3000/plugins](http://localhost:3000/plugins) in browser to see the plugins installed.
Open [http://localhost:3000/example](http://localhost:3000/example) in browser to see the output of example pluggin.
Open [http://localhost:3000/auth/google](http://localhost:3000/auth/google) in browser to try to login via Google Account
Open [http://localhost:3000/my](http://localhost:3000/my) to see you profile

Developer's Note
================

Run jshint with:

    grunt jshint

Run unit tests with:

    grunt test

Plugin creating manual
=======

This is typicale plugin code. It is placed there
[https://github.com/mywebclass/mwc_plugin_example](https://github.com/mywebclass/mwc_plugin_example)

```javascript

    var os = require('os');

    exports.extendCore = function(core){
        //some other Cocoo clock
        setInterval(function(){
            core.emit('Coocoo!','Dzin!');
        },5000);
    }

    //exports.setAppParameters = null;

    exports.setAppMiddlewares=function(core){
        return function(request, response, next) {
                response.setHeader('X-MWC-PLUGIN_EXAMPLE!','THIS ROCKS!');
                next();
            }
    }

    exports.extendAppRoutes = function(core){
        core.app.get('/time',function(request,response){
            response.send('Current time is '+(new Date().toLocaleString()));
        });


        core.app.get('/config',function(request,response){
            response.json(
                {
                    'current_time': (new Date().toLocaleString()),
                    'NODE_ENV': process.env.NODE_ENV,
                    'OS':{
                        'hostname':os.hostname(),
                        'arch':os.arch(),
                        'type':os.type(),
                        'platform':os.platform(),
                        'release':os.release(),
                        'NodeJS version':process.version
                    }
                });
        });

        //we use Mongoose Model in this route
        core.app.get('/team',function(request,response){
            request.MODEL.Users.find({active:1},function(err,users){
                if(err) throw err;
                response.json({'Team':users});
            });
        });
        //we use exposed Redis client. In a rather stupid way.
        core.app.get('/redis',function(request,response){
            request.redisClient.keys('*',function(err,keys){
                response.json(keys);
            });
        });

        //making mousetrap - when user visits this url, MWC emmits the event
        core.app.get('/honeypot',function(request,response){
            request.emitMWC('honeypot accessed','Somebody with IP of '+request.ip+' accessed the honeypot');
            response.send('Administrator was notified about your actions!');
        });
    }

```
