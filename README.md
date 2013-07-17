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

    console.log('Waiting for Mongo connection...');
    MWC.on('ready',function(){
        console.log('Mongo connected!');
        MWC.listen(MWC.get('port'), function () {
            console.log("MWC_core server listening on port " + MWC.get('port'));
        });
    });


```

Installation
=======

```

    $ git clone git@github.com:mywebclass/mwc_core.git
    $ cd nwc_core
    $ npm install
    $ npm start


````
What you can do now with this application
=======
Open [http://localhost:3000/plugins](http://localhost:3000/plugins) in browser to see the pluggins installed.
Open [http://localhost:3000/example](http://localhost:3000/example) in browser to see the output of example pluggin.
Open [http://localhost:3000/auth/google](http://localhost:3000/auth/google) in browser to try to login via Google Account
Open [http://localhost:3000/my](http://localhost:3000/my) to see you profile