var mwc_core = require('./../index.js');
var MWC = new mwc_core(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);
console.log('Waiting for Mongo connection...');
MWC.on('ready',function(){
    console.log('Mongo connected!');
    MWC.listen(MWC.get('port'), function () {
        console.log("MWC_core server listening on port " + MWC.get('port'));
    });
});
