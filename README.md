mwc_core
========

MyWebClass core node.js application to be extended by loaded automatically middleware plugins

Pluggable modules runned
=======

Right now there is only one plugable module - [https://github.com/mywebclass/mwc_plugin_example](https://github.com/mywebclass/mwc_plugin_example).

Is is binded to [http://localhost:3000/example](http://localhost:3000/example) route.

The list of active plugins can be viewed here [http://localhost:3000/example](http://localhost:3000/example)

*Example*:

```javascript

    var mwc_core = require('mwc_core');
    var MWC = new mwc_core({
        "hostUrl":"http://example.org/",
        "secret":"hammer on the keyboard",
        "mongo_url":"mongodb://user:password@mongo.example.com:10053/app111"
    });

    MWC.app.listen(MWC.app.get('port'), function () {
        console.log("MWC_core server listening on port " + MWC.app.get('port'));
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
    MWC.app.listen(MWC.app.get('port'), function () {
       console.log("MWC_core server listening on port " + MWC.app.get('port'));
    });
```

or

```javascript
    var http = require('http');
    http.createcreateServer(MWC.app).listen(MWC.app.get('port'), function () {
         console.log("MWC_core server listening on port " + MWC.app.get('port'));
    });
```

and for `https` server in this way

```javascript
    var https = require('https'),
    fs = require('fs'),
    options = {
        key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
        cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
    };
    https.createcreateServer(options,MWC.app).listen(MWC.app.get('port'), function () {
       console.log("MWC_core server listening on port " + MWC.app.get('port'));
    });
```



3. `MWC.mongoose` - is a [mongoose](https://npmjs.org/package/mongoose) instance, used by this applications.

4. `MWC.MODEL` - is a object, that includes [mongoose models](http://mongoosejs.com/docs/guide.html), used by this application.
For now, there is `MWC.MODEL.users` and `MWC.MODEL.documents` objects in it

5. `MWC.redis` - is a ready to use [redis](https://npmjs.org/package/redis) client used by application

When we add some pluggins, they can add more internals to MWC object.

Installation
=======

```shell
    $ git clone git@github.com:mywebclass/mwc_core.git
    $ cd nwc_core
    $ npm install
```

Edit the example/config.json file by your favourite text editor.

```shell
    $ node example/populate_database.js
    $ npm start
```

What you can do now with this application
=======
Open [http://localhost:3000/plugins](http://localhost:3000/plugins) in browser to see the pluggins installed.
Open [http://localhost:3000/example](http://localhost:3000/example) in browser to see the output of example pluggin.
Open [http://localhost:3000/auth/google](http://localhost:3000/auth/google) in browser to try to login via Google Account
Open [http://localhost:3000/my](http://localhost:3000/my) to see you profile