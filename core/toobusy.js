'use strict';
var toobusy = require('toobusy');

exports.name = 'kabam-core-toobusy';

exports.app = function(kernel){
  // setting toobusy's maxLag from config
  if (kernel.config.TOOBUSY && kernel.config.TOOBUSY.ENABLED && kernel.config.TOOBUSY.MAX_LAG) {
    var maxLag = parseInt(kernel.config.TOOBUSY.MAX_LAG, 10);
    if (typeof maxLag === 'number') {
      console.log('setting maxLag to ', maxLag);
      toobusy.maxLag(kernel.config.TOOBUSY.MAX_LAG);
    }
  }
  process.on('SIGINT', function() {
    // calling .shutdown allows your process to exit normally
    toobusy.shutdown();
    process.exit();
  });
};

exports.middleware = [
  function(kernel){
    //too busy middleware which blocks requests when we're too busy
    if (kernel.config.TOOBUSY && kernel.config.TOOBUSY.ENABLED) {
      kernel.app.use(function (req, res, next) {
        if (toobusy()) {
          res.send(503, 'I am busy right now, sorry.');
        } else {
          next();
        }
      });
    }
  }
];