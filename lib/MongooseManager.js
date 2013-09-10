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
      throw new Error('Config variable of mongoURL have wrong syntax. Good one is mongodb://username:somePassword@localhost:10053/mwc_dev');
    }
    if (url.parse(mongoUrl)['protocol'] !== 'mongodb:') {
      throw new Error('Config.mongoUrl have to be valid mongoose URI - ' +
        'for example mongodb://user111:111password111@localhost:10053/app111');
    }
    return true;
  };

  this.injectModels = function (mwc, _additionalModels) {
    this.validateConfig(mwc.config.mongoUrl);
    mwc.mongoConnection = mongoose.createConnection(mwc.config.mongoUrl, {
      server: {
        poolSize: 5,
        socketOptions: { keepAlive: 1 }
      }
    });
    mwc.mongoose = mongoose;

    var model = usersModel.init(mwc);
    _additionalModels.map(function (customModel) {
      model[customModel.name] = customModel.initFunction(mwc);
    });

    model.Message = require('./../models/messageModel.js').initFunction(mwc);
    model.Messages = model.Message;

    model.Group = require('./../models/groupModel.js').initFunction(mwc);
    model.Groups = model.Group;

    process.on('SIGINT', function () {
      mongoose.disconnect();
    });
    return model;
  };
};
module.exports = exports = MongooseManager;
