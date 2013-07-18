var EventEmitter = require("events").EventEmitter,
    mongoose = require('mongoose'),
    UsersModel = require('./models/USERS.js'),
    DocumentsModel = require('./models/DOCUMENTS.js'),
    express = require('express'),
    path = require('path'),
    url = require('url'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    HashStrategy = require('passport-hash').Strategy,
    GoogleStrategy = require('passport-google').Strategy,
    RedisStore = require('connect-redis')(express),
    flashMiddleware = require('connect-flash'),
    usersController = require('./routes/usersController.js'),
    async = require('async'),
    util = require("util"),
    redis = require('redis');


function MWC(config) {
    EventEmitter.call(this);
    var thisMWC=this;
    //exposable internals
    thisMWC.config=config;
    thisMWC.mongoose=mongoose.connect(config.mongo_url);
    thisMWC.app = express();
    thisMWC.plugins=[];
    thisMWC.MODEL={};
    if(config.redis){
        thisMWC.redisClient=redis.createClient(config.redis.port,config.redis.host);
    } else {
        thisMWC.redisClient=redis.createClient();
    }



//init models, DI of models into request variable
    var db=thisMWC.mongoose.connection;
    db.on('connect', function (err) {
        if (err) {
            thisMWC.emit('error',err);
        } else {
            console.log('Mongo connection established!');
            thisMWC.emit('ready');
        }
    });
    db.on('error', function (err) {
        thisMWC.emit('error',err);
    });
    var Users=UsersModel(thisMWC.mongoose, config);
    var Documents=DocumentsModel(thisMWC.mongoose, config);

    thisMWC.MODEL.Users=Users;
    thisMWC.MODEL.Users=Documents;
    thisMWC.app.use(function(request,response,next){
        request.MODEL={
            'Users':Users,
            'Documents':Documents
        };
        request.redisClient=thisMWC.redisClient;
        request.emitMWC = function(eventName,eventContent){
            thisMWC.emit(eventName,eventContent);
        }
        next();
    });

//setting passport middleware
    passport.use(new LocalStrategy(
        function (username, password, done) {
            Users.findOne({username:username, active:true}, function (err, user) {
                if(err){
                    return done(err,false,{'message':'Database broken...'});
                } else {
                    if(user){
                        if(user.verifyPassword(password)){
                            return done(null,user,{message:'Welcome, '+user.username});
                        } else {
                            return done(null, false, { message:'Access denied!' });
                        }
                    } else {
                        return done(null, false, { message:'Access denied!' });
                    }
                }
            });
        }
    ));


    passport.use(new GoogleStrategy({
            returnURL: config.hostUrl+'auth/google/return',
            realm: config.hostUrl
        },
        function(identifier, profile, done) {
            var email=profile.emails[0].value;
            console.log(profile);
            Users.findOne({'email':email, active:true},function(err,userFound){
                console.log(userFound);
                if(userFound){
                    done(err, userFound,{message:'Welcome, '+userFound.username});
                } else {
                    //model.UserModel.create({email:email},function(err,userCreated){
                        done(err,false,{ message:'Access denied!' });//todo - i am not sure if user can register by singing in with Google Acount
                    //});
                }
            });
        }
    ));


//Storing user in session
    passport.serializeUser(function (user, done) {
        done(null, user.username);
    });

    passport.deserializeUser(function (username, done) {
        Users.findOne({username:username}, function (err, user) {
            done(err, user);
        });
    });
//end of setting passport



    thisMWC.app.configure('development', function () {
        console.log('Development enviroment!');
        thisMWC.app.use(express.responseTime());
        thisMWC.app.use(express.logger('dev'));
    });

    thisMWC.app.configure('production', function () {
        console.log('Production enviroment!');
        thisMWC.app.locals.production = true;
        thisMWC.app.enable('view cache');
        thisMWC.app.use(express.logger('short'));
    });

    thisMWC.app.set('port', process.env.PORT || 3000);

//setting template engine. maybe we need to make is a plugin
    thisMWC.app.set('views', __dirname + '/views');
    thisMWC.app.set('view engine', 'html');
    thisMWC.app.set('layout', 'layout');
    thisMWC.app.engine('html', require('hogan-express'));
//end of setting template engine
    thisMWC.app.enable('trust proxy');

    thisMWC.app.use(express.compress());
    thisMWC.app.use(express.favicon());
    thisMWC.app.use(express.bodyParser());
    thisMWC.app.use(express.methodOverride());
    thisMWC.app.use(express.cookieParser(config.secret));
    thisMWC.app.use(express.session({
        secret: config.secret,
        store: new RedisStore({prefix: 'mwc_core_'}),
        expireAfterSeconds: 180,
        httpOnly: true
    }));
    thisMWC.app.use(express.csrf());
    thisMWC.app.use(flashMiddleware());
    thisMWC.app.use(passport.initialize());
    thisMWC.app.use(passport.session());

    thisMWC.app.use(express.static(path.join(__dirname, 'public')));//static assets, maybe we need to set is as a plugin
//dependency injection of plugins
    var packages = require(path.dirname(module.parent.filename) + '/package.json').dependencies;

    for (var x in packages) {
        var pluginParameters = /^mwc_plugin_([a-z0-9_]+)$/.exec(x);
        //this regex is parsed like it for our plugins
        // [ 'mwc_plugin_example','example',index: 0,input: 'mwc_plugin_example' ]
        if (pluginParameters) {
            require(pluginParameters[0])(thisMWC);
            thisMWC.plugins.push({'plugin':pluginParameters[0],'version':packages[x]});
            console.log('Plugin of "'+pluginParameters[1]+'" is used!');
        }
    }



    thisMWC.app.configure('development', function () {
        thisMWC.app.use(express.errorHandler());
    });


    thisMWC.app.configure('production', function () {
        thisMWC.app.use(function (err, req, res, next) {
            thisMWC.emit('error',err);
            res.status(503);
            res.header('Retry-After', 360);
            res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
        });
    });
    thisMWC.app.use(thisMWC.app.router);//set up the router middleware

    //get active plugins - works only on development enviroment
    thisMWC.app.configure('development', function () {
        thisMWC.app.get('/plugins',function(request,response){
            response.json(thisMWC.plugins);
        });
    });
    //routes for users

    usersController(thisMWC.app,config);//restfull api for users

    //autorize by email and password



    //autorize by google
    thisMWC.app.get('/auth/google', passport.authenticate('google'));
    thisMWC.app.get('/auth/google/return',passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' }));

    thisMWC.app.post('/logoff',function(request,response){
        request.logout();
        response.send(200,'OK');
    });

    //catch all verb to show 404 error to wrong routes
    thisMWC.app.get('*', function (request, response) {
        response.send(404);
    });

    return thisMWC;
}

util.inherits(MWC, EventEmitter);

MWC.prototype.populate_database = function(data){
    console.log('Populating the database');
    if(data.users && data.users instanceof Array){
        console.log(data.users);
        for(var i=0;i<data.users.length;i++){//todo - get some rest and make it via async.parallel - Anatolij
            console.log(data.users[i]);
            this.MODEL.Users.create(data.users[i], function (err, userSaved) {
                if(err) throw err;
                console.log(userSaved);
            })
        }
    }

}



module.exports = exports = MWC;