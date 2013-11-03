exports.name = "Event";

function factory(kabam) {
  var ObjectId = kabam.mongoose.Schema.Types.ObjectId;

  var permissions = {
    "view": ["student", "assistant", "instructor"],
    "edit": ["assistant", "instructor"],
    "create": ["instructor"],
    "delete": []
  };

  var EventSchema = new kabam.mongoose.Schema({
    title: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String
    },
    start: {
      type: Date,
      required: true,
      index: true
    },
    end: {
      type: Date,
      required: true
    },
    owner: {
      type: ObjectId,
      required: true,
      index: true
    },
    group_id: {
      type: ObjectId,
      required: true,
      index: true
    },
    _permissions: {
      type: {},
      default: permissions
    }
  });

  return kabam.mongoConnection.model("Event", EventSchema);
};

exports.model = {
  Event: factory
};
