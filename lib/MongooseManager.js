'use strict';
var mongoose = require('mongoose'),
  url = require('url'),
  usersModel = require('./../models/userModel.js');

function MongooseManager() {
  this.validateConfig = function (mongoUrl) {
    //sanity check for mongoUrl
    if (!mongoUrl) {
      throw new Error('Config variable of mongoURL is missed!');
    }
    if (!url.parse(mongoUrl)) {
      throw new Error('Config variable of mongoURL have wrong syntax. Good one is mongodb://username:somePassword@localhost:10053/kabam_dev');
    }
    if (url.parse(mongoUrl).protocol !== 'mongodb:') {
      throw new Error('Config.mongoUrl have to be valid mongoose URI - ' +
        'for example mongodb://user111:111password111@localhost:10053/app111');
    }
    return true;
  };

  this.injectModels = function (kabam, additionalModels) {
    this.validateConfig(kabam.config.mongoUrl);
    kabam.mongoConnection = mongoose.createConnection(kabam.config.mongoUrl, {
      server: {
        poolSize: 5,
        socketOptions: { keepAlive: 1 }
      }
    });
    kabam.mongoose = mongoose;

    var model = usersModel.init(kabam);
    additionalModels.map(function (customModel) {
      model[customModel.name] = customModel.initFunction(kabam);
    });

    model.Message = require('./../models/messageModel.js').initFunction(kabam);
    model.Messages = model.Message;

    model.Group = require('./../models/groupModel.js').initFunction(kabam);
    model.Groups = model.Group;

    process.on('SIGINT', function () {
      mongoose.disconnect();
    });
    return model;
  };
}

module.exports = exports = MongooseManager;
