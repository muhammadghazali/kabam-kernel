var EventEmitter = require("events").EventEmitter,
    mongoose = require('mongoose'),
    UsersModel = require('./models/USERS.js'),
    DocumentsModel = require('./models/DOCUMENTS.js'),
    express = require('express'),
    path = require('path'),
    url = require('url'),

    http = require('http'),
    https = require('https'),

    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    HashStrategy = require('passport-hash').Strategy,
    GoogleStrategy = require('passport-google').Strategy,

    RedisStore = require('connect-redis')(express),
    flashMiddleware = require('connect-flash'),
    usersController = require('./routes/usersController.js'),
    async = require('async'),
    util = require("util"),
    redis = require('redis'),
    toobusy = require('toobusy');

function MWC(config) {
    EventEmitter.call(this);
    this.config=config;
    this.setCoreFunctions=[];
    this.setAppParametersFunctions=[];
    this.setAppMiddlewaresFunctions=[];
    this.setAppRoutesFunctions=[];
    return this;
}
util.inherits(MWC, EventEmitter);

//extending application
MWC.prototype.extendCore = function(settingsFunction){
    this.setCoreFunctions.push(settingsFunction(this));
    return this;
}
MWC.prototype.setAppParameters = function(environment,settingsFunction){
    var environmentToUse=null;
    if(typeof settingsFunction == 'undefined'){
        settingsFunction=environment;
    }
    if(typeof environment == 'String'){
        environmentToUse=[];
        enviromentToUse.push(environment);
    }
    if(environment instanceof Array){
        environmentToUse=environment;
    }
    if(environmentToUse){
        for(var i=0;i<environmentToUse.length;i++){
            this.setAppParametersFunctions.push({
                'enviroment':environmentToUse[i],
                'SettingsFunction':settingsFunction(this)
            });
        }
    } else {
        this.setAppParametersFunctions.push({
            'SettingsFunction':settingsFunction(this)
        });
    }
    return this;
}
MWC.prototype.setAppMiddlewares  = function(environment,settingsFunction){
    //todo - add path to implement middleware
    var environmentToUse=null;
    if(typeof settingsFunction == 'undefined'){
        settingsFunction=environment;
    }
    if(typeof environment == 'String'){
        environmentToUse=[];
        environmentToUse.push(environment);
    }
    if(environment instanceof Array){
        environmentToUse=environment;
    }
    if(environmentToUse){
        for(var i=0;i<environmentToUse.length;i++){
            this.setAppMiddlewaresFunctions.push({
                'enviroment':environmentToUse[i],
                'SettingsFunction':settingsFunction
            });
        }
    } else {
        this.setAppMiddlewaresFunctions.push({
            'SettingsFunction':settingsFunction
        });
    }


}
MWC.prototype.extendAppRoutes = function(settingsFunction){
    this.setAppRoutesFunctions.push(settingsFunction(this));
}

MWC.prototype.ready=function(){
    var thisMWC=this;
    thisMWC.prepared=true;


    //injecting redis
    if(thisMWC.config.redis){
        thisMWC.redisClient=redis.createClient(thisMWC.config.redis.port,thisMWC.config.redis.host);
    } else {
        thisMWC.redisClient=redis.createClient();
    }
    //injecting default mongoose databases
    thisMWC.mongoose=mongoose.connect(thisMWC.config.mongo_url);
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
    var Users=UsersModel(thisMWC.mongoose, thisMWC.config);
    var Documents=DocumentsModel(thisMWC.mongoose, thisMWC.config);

    thisMWC.MODEL={
        'Users':Users,
        'Documents':Documents
    };
    //doing extendCore
    //extending core by extendCore
    thisMWC.setCoreFunctions.map(function(settingsFunction){
       settingsFunction(thisMWC);
    });

    //setting passport
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
                returnURL: thisMWC.config.hostUrl+'auth/google/return',
                realm: thisMWC.config.hostUrl
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

    //start vendoring expressJS application
    thisMWC.app = express();

//too busy middleware which blocks requests when we're too busy
    thisMWC.app.use(function(req, res, next) {
        if (toobusy()) {
            res.send(503, "I'm busy right now, sorry.");
        } else {
            next();
        }
    });

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

    //doing setAppParameters
    //extend vendored application settings
    thisMWC.setAppParametersFunctions.map(function(func){
        //todo - add path to implement middleware
        func(thisMWC);
    });

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

    thisMWC.app.use(express.compress());
    thisMWC.app.use(express.favicon());
    thisMWC.app.use(express.bodyParser());
    thisMWC.app.use(express.methodOverride());
    thisMWC.app.use(express.cookieParser(thisMWC.config.secret));
    thisMWC.app.use(express.session({
        secret: thisMWC.config.secret,
        store: new RedisStore({prefix: 'mwc_core_'}),//todo - client session store
        expireAfterSeconds: 180,
        httpOnly: true
    }));
    thisMWC.app.use(express.csrf());
    thisMWC.app.use(flashMiddleware());
    thisMWC.app.use(passport.initialize());
    thisMWC.app.use(passport.session());

    thisMWC.app.use(express.static(path.join(__dirname, 'public')));//static assets, maybe we need to set is as a plugin

    thisMWC.app.configure('development', function () {
        thisMWC.app.use(express.errorHandler());
    });

    //injecting default internals via middleware
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

    //doing setAppMiddleware
    //extend vendored application middlewares settings
    thisMWC.setAppMiddlewaresFunctions.map(function(middleware){
        if(middleware.enviroment){
            thisMWC.app.configure(middleware.enviroment,function(){
                thisMWC.app.use(middleware.SettingsFunction(thisMWC));
            });
        } else {
            thisMWC.app.use(middleware.SettingsFunction(thisMWC));
        }
    });

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

    //doing setAppRoutes
    thisMWC.setAppRoutesFunctions.map(function(func){
        func(thisMWC);
    });

    //setting up the default routes
    usersController(thisMWC.app,thisMWC.config);//restfull api for users

    thisMWC.app.configure('development', function () {
        //default route to show plugins installed
        thisMWC.app.get('/plugins',function(request,response){
            response.json(thisMWC.plugins);
        });
    });

    //autorize by email and password



    //autorize by facebook,twitter,gitgub - todo - implement it

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
MWC.prototype.listen=function(httpOrHttpsOrPort){

    if(!this.prepared){
        this.ready();
    }

    if(httpOrHttpsOrPort){
        if(typeof httpOrHttpsOrPort =='number' && httpOrHttpsOrPort>0){
            this.app.listen(httpOrHttpsOrPort);
            return;
        }

        if(httpOrHttpsOrPort instanceof http || httpOrHttpsOrPort instanceof https){
            httpOrHttpsOrPort.createcreateServer(this.app).listen(this.app.get('port'));
            return;
        }

        throw new Error('Function MWC.listen(httpOrHttpsOrPort) accepts objects of null, http, https or port\'s number as argument!')
    } else {
        this.app.listen(this.app.get('port'));
    }
}


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

process.on('SIGINT', function() {
    //server.close(); //server is instantained somewere else...
    // calling .shutdown allows your process to exit normally
    toobusy.shutdown();
    process.exit();
});