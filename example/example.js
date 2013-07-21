var mwc_core = require('./../index.js');
//setting up the config
var MWC = new mwc_core(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);
/*
MWC.extendCore(function(core){ //works now!!!
   setInterval(function(){
       core.emit('Coocoo!','Time now is '+(new Date().toLocaleTimeString()));
   },5000);
});
*/
/*
MWC.setAppParameters(['development','staging'],function(core){

});
*/
MWC.setAppMiddlewares(['development','staging'],function(core){ //do not work for now
    return function(req,res,next){
        res.setHeader('X-Production','NO!');
        next();
    };
});
/*
MWC.extendAppRoutes(//do not work for now
        function (core) {
        core.app.get('/', function (req, res) {
            res.send('Hello!');
        })}
);
*/
//api/user works to!!!

//binding application to port
MWC.listen(3000);


//listening of MWC events. 'Coocoo!' is emmited by mwc_plugin_example every 5 seconds
MWC.on('Coocoo!', function (message) {
    console.log('Coocoo! Coocoo! ' + message);
});

MWC.on('honeypot accessed', function (message) {
    console.log('Attention! Somebody tries to hack us! ' + message);
});

