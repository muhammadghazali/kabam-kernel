var mwc_core = require('./../index.js');
var MWC = new mwc_core(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);


MWC.listen(MWC.get('port'), function () {
    console.log("MWC_core server listening on port " + app.get('port'));
});