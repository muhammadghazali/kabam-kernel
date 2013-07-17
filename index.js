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
    util = require("util");

function MWC(config) {
    EventEmitter.call(this);
    var thisMWC=this;
    this.config=config;

    var packages = require(path.dirname(module.parent.filename) + '/package.json').dependencies,
        app = express(),
        pluginsInUse=[];

//init models, DI of models into request variable
    this.mongoose=mongoose.connect(config.mongo_url);
    var db=this.mongoose.connection;
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
    var Users=UsersModel(mongoose, config);
    var Documents=DocumentsModel(mongoose, config);

    this.MODEL = {
        'Users':Users,
        'Documents':Documents
    };
    app.use(function(request,response,next){
        request.MODEL={
            'Users':Users,
            'Documents':Documents
        };
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
//-------

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
        var pluginParameters = /^mwc_plugin_([a-z0-9_]+)$/.exec(x);
        //this regex is parsed like it for our plugins [ 'mwc_plugin_example','example',index: 0,input: 'mwc_plugin_example' ]
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
            thisMWC.emit('error',err);
            res.status(503);
            res.header('Retry-After', 360);
            res.send('Error 503. There are problems on our server. We will fix them soon!');//todo - change to our page...
        });
    });
    //routes for users

    usersController(app,config);
    app.get('/auth/google', passport.authenticate('google'));
    app.get('/auth/google/return',passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' }));
    app.post('/logoff',function(request,response){
        request.logout();
        response.send(200,'OK');
    });

    app.get('*', function (request, response) {
        response.send(404);
    });
    this.app = app;
    return this;
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