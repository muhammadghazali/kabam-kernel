'use strict';
var mongoose = require('mongoose'),
  url = require('url'),
  usersModel = require('./../models/userModel.js');

function MongooseManager() {
  this.validateConfig = function (MONGO_URL) {
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
  };

  this.injectModels = function (kabam, additionalModels) {
    this.validateConfig(kabam.config.MONGO_URL);
    kabam.mongoConnection = mongoose.createConnection(kabam.config.MONGO_URL, {
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
