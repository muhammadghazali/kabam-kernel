var kabamKernel = require('./../index.js');
//setting up the config
var kabam = kabamKernel(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);


//extending the core
kabam.extendCore('getSum', function (config) {
  return function (a, b) {
    return a + b;
  };
});

kabam.extendCore('TempVar', 42);


//set global lever variables for expressJS application
kabam.extendApp(['development', 'staging'], function (kabam) {
  kabam.app.set('TempVar', kabam.shared.TempVar);
});


kabam.extendModel('Cats', function (kabam) {
  var CatsSchema = new kabam.mongoose.Schema({
    'nickname': String
  });

  CatsSchema.index({
    nickname: 1
  });

  return kabam.mongoConnection.model('cats', CatsSchema);
});

//set middleware for development and staging enviroments
kabam.extendMiddleware(['development', 'staging'], function (kabam) {
  return function (req, res, next) {
    res.setHeader('X-Production', 'NO!');
    next();
  };
});
//we add some routes
kabam.extendRoutes(
  function (kabam) {
    kabam.app.get('/', function (req, res) {
      var authByGoogleString = (req.user) ? '<li><a href="/my">See your profile</a></li>' : '<li><a href="/auth/google">Auth by google</a></li>';

      res.send('<html>' +
        '<head>MyWebClass Core Example</head>' +
        '<body>' +
        '<p>TempVar is ' + kabam.app.get('TempVar') + '</p>' +
        '<p>Hello, friend! You can do this things:</p><ul>' +
        '<li>See current <a href="/time">time</a>.</li>' +
        '<li>See <a href="/team">team</a> on this server.</li>' +
        '<li>See all <a href="/redis">redis</a> keys stored.</li>' +
        authByGoogleString +
        '<li>See this server <a href="/config">parameters</a>.</li>' +
        '<li>See users <a href="/api/users">api endpoint</a> on this server.</li>' +
        '<li>See <a href="/plugins">plugins</a> installed on this server.</li>' +
        '<li><a href="/honeypot">Notify</a> admin of your presense.</li>' +
        '<li>See this application <a href="https://github.com/mywebclass/kabam_plugin_example">source on Github</a></li>' +
        '</ul></body>' +
        '</html>');
    });

    //we use Mongoose Model in this route
    kabam.app.get('/team', function (request, response) {
      request.model.User.find({}, function (err, users) {
        if (err) {
          throw err;
        }
        response.json({'Team': users});
      });
    });
    //we use exposed Redis client. In a rather stupid way.
    kabam.app.get('/redis', function (request, response) {
      request.redisClient.keys('*', function (err, keys) {
        response.json(keys);
      });
    });

    //making mousetrap - when user visits this url, MWC emmits the event
    kabam.app.get('/honeypot', function (request, response) {
      request.emitMWC('honeypot accessed', 'Somebody with IP of ' + request.ip + ' accessed the honeypot');
      response.send('Administrator was notified about your actions!');
    });

    kabam.app.get('/kittens', function (request, response) {
      request.model.Cats.find({}, function (err, cats) {
        if (err) {
          throw err;
        }
        response.json(cats);
      });
    });

    kabam.app.get('/dogs', function (request, response) {
      request.model.Dogs.find({}, function (err, dogs) {
        if (err) {
          throw err;
        }
        response.json(dogs);
      });
    });

  }
);
//injecting plugin as an object
kabam.usePlugin({
  'name': 'exampleClassPlugin',
  'core': null, //can be ommited
  'model': {'Dogs': function (kabam) {
    var DogsSchema = new kabam.mongoose.Schema({
      'nickname': String
    });
    DogsSchema.index({
      nickname: 1
    });
    return kabam.mongoConnection.model('dogs', DogsSchema);
  }},
//  'app': null, //can be ommited
//  'middleware': null, //can be ommited
  'routes': function (kabam) {
    kabam.app.get('/newPlugin', function (req, res) {
      res.send('New plugin is installed as object');
    });
  }
});

//try{
//  //injecting plugin as an name of installed npm package!
//  MWC.usePlugin('kabam_plugin_example');
//} catch (e){
//  if(e.code === 'MODULE_NOT_FOUND'){
//    console.error('kabam_plugin_example is not installed.');
//  }
//}

//listening of MWC events. 'Coocoo!' is emmited by kabam_plugin_example every 5 seconds
kabam.extendListeners('Coocoo!', function (message) {
  console.log('Coocoo! Coocoo! ' + message);
});

kabam.extendListeners('honeypot accessed', function (message) {
  console.log('Attention! Somebody tries to hack us! ' + message);
});


//binding application to port - running as single instance
//MWC.start();

//starting application as cluster
var isMaster=kabam.startCluster();
if(isMaster){
  console.log('This is master with PID #' + process.pid);
} else {
  console.log('This is worker with PID #' + process.pid);
}

//logging requests
kabam.on('http', console.log);

//testing custom function defined on line 10
console.log('Sum of 2 and 2 is ' + kabam.shared.getSum(2, 2));

//testing that kernel is event emmiter
setInterval(function () {
  kabam.emit('Coocoo!', 'Time now is ' + (new Date().toLocaleTimeString()));
}, 5000);


setTimeout(function () {
  kabam.model.Cats.create({nickname: 'Chubais'}, function (err, cat) {
    if (err) {
      throw err;
    }
    if (cat) {
      console.log('Skoro tolko koshki rodyatsya!');
      console.log('Happy birthday, ' + cat.nickname);
    }
  });
}, 5000);

setTimeout(function () {
  kabam.model.Dogs.create({nickname: 'Laika'}, function (err, dog) {
    if (err) {
      throw err;
    }
    if (dog) {
      console.log('Happy birthday, ' + dog.nickname);
    }
  });
}, 4000);
