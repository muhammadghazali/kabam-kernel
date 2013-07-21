var mwc_core = require('./../index.js');
//setting up the config
var MWC = new mwc_core(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);

//we extend the mwc_core instance
MWC.extendCore(function(core){
   //starting coocoo clock)
   setInterval(function(){
       core.emit('Coocoo!','Time now is '+(new Date().toLocaleTimeString()));
   },5000);
   //adding custom function to MWC module
   core.getSum = function(a,b){
       return a+b;
   }
});

//set global lever variables for expressJS application
MWC.setAppParameters(['development','staging'],function(core){
    core.app.set('TempVar','42');
});

//set middleware for development and staging enviroments
MWC.setAppMiddlewares(['development','staging'],function(core){
    return function(req,res,next){
        res.setHeader('X-Production','NO!');
        next();
    };
});
//we add some routes
MWC.extendAppRoutes(
        function (core) {
        core.app.get('/', function (req, res) {
            res.send('Hello! TempVar is '+core.app.get('TempVar'));
        })}
);

//api/user works to!!!

//binding application to port
MWC.listen(3000);

//testing custom function defined on line 10
console.log('Sum of 2 and 2 is '+MWC.getSum(2,2));

//listening of MWC events. 'Coocoo!' is emmited by mwc_plugin_example every 5 seconds
MWC.on('Coocoo!', function (message) {
    console.log('Coocoo! Coocoo! ' + message);
});

MWC.on('honeypot accessed', function (message) {
    console.log('Attention! Somebody tries to hack us! ' + message);
});

