var mwc_core = require('./../index.js');
//setting up the config
var MWC = new mwc_core(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);

//binding application to port
MWC.app.listen(MWC.app.get('port'), function () {
    console.log("MWC_core server listening on port " + MWC.app.get('port'));
});

//listening of MWC events. 'Coocoo!' is emmited by mwc_plugin_example every 5 seconds
MWC.on('Coocoo!',function(message){
   console.log('Coocoo! Coocoo! '+message);
});

MWC.on('honeypot accessed',function(message){
    console.log('Attention! Somebody tries to hack us! '+message);
});

