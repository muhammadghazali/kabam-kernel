'use strict';
exports.initFunction = function (kabam) {

  var messageSchema = new kabam.mongoose.Schema({
      'to': kabam.mongoose.Schema.Types.ObjectId,
      'toProfile': { type: kabam.mongoose.Schema.Types.ObjectId, ref:'User' },
      'from': kabam.mongoose.Schema.Types.ObjectId,
      'fromProfile': { type: kabam.mongoose.Schema.Types.ObjectId, ref:'User' },
      'createdAt': { type: Date, default: Date.now },
      'message': {type: String, trim: true } //trim whitespaces - http://mongoosejs.com/docs/api.html#schema_string_SchemaString-trim
    });

  messageSchema.index({
    to: 1,
    from: 1,
    createdAt: 1
  });

  messageSchema.statics.getForUser = function (user, parameters, callback) {
    if (user && user._id) {
      user.getRecentMessages(parameters.limit, parameters.offset, callback);
    } else {
      callback(null);
    }
  };

  messageSchema.statics.canCreate = function (user, callback) {
    callback(null, user && user.emailVerified && user.profileComplete && !user.isBanned);
  };

  messageSchema.methods.canRead = function (user, callback) {
    callback(null, user && (user._id.toString() === this.to.toString() || user._id.toString() === this.from.toString()));
  };

  messageSchema.methods.canWrite = function (user, callback) {
    callback(null, false);
  };

  return kabam.mongoConnection.model('messages', messageSchema);
};
