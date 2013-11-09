exports.name = 'kabam-core-model-loader';
exports.core = function(kernel) {
  if (!kernel.mongoose) {
    throw new Error('Mongoose not initialized');
  }

  kernel.model = {};

  Object.keys(kernel.extensions.models).forEach(function(name) {

    var schema = kernel.extensions.models[name](kernel);

    if (schema instanceof kernel.mongoose.Schema) {
      // instantiate the model if its a mongoose schema
      kernel.model[name] = kernel.mongoConnection.model(name, schema);
    } else {
      // assume that it is already a model constructor
      kernel.model[name] = schema;
    }
  });
};
