exports.name = 'kabam-core-model-loader';
exports.core = function(kernel){
  kernel.model = {};

  Object.keys(kernel.extensions.models).forEach(function(name) {
    var schema = kernel.extensions.models[name](kernel);
    try {
      // TODO: maybe this should be done in the mongoose plugin
      // for now we just assume that mongoConnection is always present
      kernel.model[name] = kernel.mongoConnection.model(name, schema);
    } catch(e) {
      // What if we don't want mongoose models?
      kernel.model[name] = schema;
    }
  });
};