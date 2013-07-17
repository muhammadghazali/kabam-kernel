function MWC(config) {
    var express = require('express'),
        path = require('path'),
        packages = require(path.dirname(module.parent.filename) + '/package.json').dependencies;
        url = require('url'),
        passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        HashStrategy = require('passport-hash').Strategy,
        GoogleStrategy = require('passport-google').Strategy,
        RedisStore = require('connect-redis')(express),
        flashMiddleware = require('connect-flash'),
        app = express(),
        pluginsInUse=[];


//setting passport middleware

//passport.use()
//
    app.configure('development', function () {
        console.log('Development enviroment!');
        app.use(express.responseTime());
        app.use(express.logger('dev'));
    });

    app.configure('production', function () {
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

//dependency injection of plugins
    for (var x in packages) {
        var pluginParameters = /^mwc_plugin_([a-z0-9_]+)/.exec(x);
        //this regex is parsed like it for our pluggins [ 'mwc_plugin_example','example',index: 0,input: 'mwc_plugin_example' ]
        if (pluginParameters) {
            require(pluginParameters[0])(app, '/' + pluginParameters[1],config);
            pluginsInUse.push({
                'name':pluginParameters[0],
                'route':'/'+pluginParameters[1]
            });
            console.log('Plugin of "'+pluginParameters[1]+'" is used!');
        }
    }
    app.use('/plugins',function(request,response,next){
        response.json(pluginsInUse);
    });
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(app.router);

    app.configure('development', function () {
        app.use(express.errorHandler());
    });


    app.configure('production', function () {
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
    return app;
}

module.exports = exports = MWC;