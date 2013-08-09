var mongoose = require('mongoose'),
  url = require('url'),
  usersModel = require('./../models/userModel.js');

var mongooseManager = {};

mongooseManager.validateConfig = function (mongoUrl) {
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

mongooseManager.injectModels = function (mwc, _additionalModels) {
  this.validateConfig(mwc.config.mongoUrl);
  mwc.mongoose = mongoose.connect(mwc.config.mongoUrl, { server: { poolSize: 3 }});
  var model = {User: usersModel(mwc)};
  model.Users = model.User;//for compatibiliry with previous code!
  _additionalModels.map(function (customModel) {
    model[customModel.name] = customModel.initFunction(mwc.mongoose, mwc.config);
  });
  return model;
};

process.on('SIGINT', function () {
  mongoose.disconnect();
});
module.exports = exports = mongooseManager;
