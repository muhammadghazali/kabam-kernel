exports.name = "kabam-core-group-manager";

function GroupModel(mongoose) {
  var Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

  return mongoose.model(
    "Group", 
    new Schema({
      name: {
        type: String,
        required: true,
        index: true
      },
      description: {
        type: String
      },
      group_type: {
        type: String,
        required: true
      },
      parent_id: {
        type: ObjectId,
        required: true
      },
      owner: {
        type: ObjectId
      },
      custom: {},
      _permissions: {
        type: {},
        index: true
      },
      removed: {
        type: Boolean,
        default: 0
      }
    })
  );
}

exports.core = function(kabam) {
  // This should be done upper in the chain
  kabam.mw || (kabam.mw = {});

  var lookupGroup = function(req, res, next) {
    var Group = GroupModel(kabam.mongoose);

    var input = req.query || req.body;
    var group_id = req.query.group_id;
    Group.findById(group_id, function(err, group) {
      if(group) {
        req.group = group;
        return next();
      }
      res.send(403);
    });
  };
  kabam.mw.lookupGroup = lookupGroup;

  // Add middleware for authorization
  kabam.mw.authorize = function(actions) {
    return function(req, res, next) {
      lookupGroup(req, res, function() {
        var user_id = req.session.user._id;
        req.group.authorize(user_id, actions, function(err, authorized) {
          if(err) return res.send(err, 400);
          if(!authorized) return res.send(403);
          next();
        });
      });
    }
  };

  // GroupFactory for creating domain-specific Group types
  kabam.groups.GroupFactory = require('./group-factory')(Group, kabam.model.User);

};