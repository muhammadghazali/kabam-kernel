var mongoose = require('mongoose'),
  url = require('url'),
  usersModel = require('../models/Users.js');

var mongooseManager = exports = module.exports = {};

mongooseManager.validateConfig = function(mongoUrl) {
  //sanity check for mongoUrl
  if (!mongoUrl) {
    throw new Error('Config variable of mongoURL is missed!');
  }
  if (!url.parse(mongoUrl)) {
    throw new Error('Config variable of mongoURL have wrong syntax. Good one is mongodb://username:somePassword@localhost:10053/mwc_dev');
  }
  if (url.parse(mongoUrl)['protocol'] !== 'mongodb:') {
    throw new Error('Config.mongoUrl have to be valid mongoose URI - ' +
                    'for example mongodb://user111:111password111@localhost:10053/app111');
  }
  return true;
};

var setConnectEvent = function(mwc) {
  var db = mwc.mongoose.connection;
  db.on('connect', function (err) {
    if (err) {
      mwc.emit('error', err);
    } else {
      console.log('Mongo connection established!');
      mwc.emit('mongoReady');
    }
  });

  db.on('error', function (err) {
    mwc.emit('error', err);
  });
};

mongooseManager.create = function(mongoUrl) {
  mongooseManager.validateConfig(mongoUrl);
  mongoose = mongoose.connect(mongoUrl, { server: { poolSize: 3 }});
  mongoose.setConnectEvent = setConnectEvent;
  return mongoose;
};

mongooseManager.initModels = function(mwc) {
  var Users = usersModel(mwc);
  return {
    'Users': Users
  };
};
