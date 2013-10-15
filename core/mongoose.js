'use strict';

var mongoose = require('mongoose'),
  url = require('url');

function validateConfig(MONGO_URL) {
  //sanity check for MONGO_URL
  if (!MONGO_URL) {
    throw new Error('Config variable `MONGO_URL` is missed!');
  }
  if (!url.parse(MONGO_URL)) {
    throw new Error('Config variable `MONGO_URL` has wrong syntax. Good one is mongodb://username:somePassword@localhost:10053/kabam_dev');
  }
  if (url.parse(MONGO_URL).protocol !== 'mongodb:') {
    throw new Error('Config.MONGO_URL have to be valid mongoose URI - ' +
      'for example mongodb://user111:111password111@localhost:10053/app111');
  }
  return true;
}


exports.name = 'kabam-core-mongoose';
exports.core = function(kernel){
  validateConfig(kernel.config.MONGO_URL);
  var mongoConnection = mongoose.createConnection(kernel.config.MONGO_URL, {
    server: {
      poolSize: 5,
      socketOptions: { keepAlive: 1 }
    }
  });
  return {
    mongoose: mongoose,
    mongoConnection: mongoConnection
  };
};