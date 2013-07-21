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

