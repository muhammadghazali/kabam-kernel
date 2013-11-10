exports.name = 'Event';

function factory(kernel) {
  var ObjectId = kernel.mongoose.Schema.Types.ObjectId;

  var permissions = {
    read: ['student', 'assistant', 'instructor'],
    update: ['assistant', 'instructor'],
    create: ['instructor'],
    delete: []
  };

  var eventSchema = new kernel.mongoose.Schema({
    name: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String
    },
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true
    },
    owner_id: {
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

  return eventSchema;
};

exports.model = {
  Event: factory
};
