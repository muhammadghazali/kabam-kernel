var kabamKernel = require('../index'),
  mongoose = require('mongoose');

exports.createKabam = function(method, config, plugins, done){
  // config, plugins, done
  if(['string', 'number'].indexOf(typeof method) === -1){
    done = plugins;
    plugins = config;
    config = method;
    method = config.PORT;
  }

  // config, done
  if(typeof plugins === 'function'){
    done = plugins;
    plugins = [];
  }

  if(!Array.isArray(plugins)){
    plugins = [plugins];
  }

  if(!method){
    method = 'app';
  }

  var connection = mongoose.createConnection(config.MONGO_URL);
  var kabam = kabamKernel(config);

  plugins.forEach(function(plugin){
    kabam.usePlugin(plugin);
  });

  connection.on('open', function(){
    connection.db.dropDatabase(function () {
      try {
        kabam.on('started', function () {
          done(null, kabam);
        });
        kabam.start(method);
      } catch(e){
        done(e);
      }
    });
  });
};