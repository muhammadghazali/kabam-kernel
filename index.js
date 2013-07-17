var packages = require('./package.json').dependencies,//wierd, but IT WORKS!
    express = require('express'),
    http = require('http'),
    path = require('path'),
    url = require('url'),
    config = require('./config.json')[(process.env.NODE_ENV) ? ('process.env.NODE_ENV') : 'development'],
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    HashStrategy = require('passport-hash').Strategy,
    GoogleStrategy = require('passport-google').Strategy,
    RedisStore = require('connect-redis')(express),
    flashMiddleware = require('connect-flash'),
    app = express();

//setting passport middleware

//passport.use()
//
app.configure('development', function () {
    console.log('Development enviroment!');
    app.use(express.responseTime());
    app.use(express.logger('dev'));
});

app.configure('production',function(){
    console.log('Production enviroment!');
    app.locals.production = true;
    app.enable('view cache'); //prod!
    app.use(express.logger('short'));
});

app.set('port', process.env.PORT || 3000);

app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('layout', 'layout');
app.engine('html', require('hogan-express'));
app.enable('trust proxy');

app.use(express.compress());
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(config.secret));
app.use(express.session({
    secret: config.secret,
    store: new RedisStore({prefix: 'mwc_core_'}),
    expireAfterSeconds: 180,
    httpOnly: true
}));
app.use(express.csrf());
app.use(flashMiddleware());
app.use(passport.initialize());
app.use(passport.session());

//dependancy injection of pluggins
for (var x in packages) {
    var pluginParameters = /^mwc_plugin_([a-z0-9_]+)/.exec(x);
    //[ 'mwc_plugin_example','example',index: 0,input: 'mwc_plugin_example' ]
    if (pluginParameters) {
        app.use('/'+pluginParameters[1], require(pluginParameters[0]));
    }
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

app.configure('development', function () {
    app.use(express.errorHandler());
});


app.configure('production',function(){
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        res.status(503);
        res.header('Retry-After', 360);
        res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
    });
});


app.get('*', function (request, response) {
    response.send(404);
});

http.createServer(app).listen(app.get('port'), function () {
    console.log("MWC_core server listening on port " + app.get('port'));
});