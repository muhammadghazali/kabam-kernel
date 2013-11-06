exports.name = "kabam-core-group-manager";

function GroupModel(kabam) {
  var Schema = kabam.mongoose.Schema
    , ObjectId = Schema.ObjectId;

  return kabam.mongoConnection.model(
    "GroupModel", 
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
        required: true,
        index: true
      },
      parent_id: {
        type: ObjectId,
        index: true
      },
      owner: {
        type: ObjectId,
        required: true,
        index: true
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
  kabam.groups || (kabam.groups = {});

  var lookupGroup = function(req, res, next) {
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

  kabam.mw.lookup = function(modelType, idParam) {
    idParam || (idParam = "id");
    return function(req, res, next) {
      var _id = req.params[idParam];
      kabam.model[modelType].findById(_id, function(err, model) {
        if(err) return res.send(err, 400);
        if(!model) return res.send(404);
        req.model = model;
        next();
      });
    }
  };

  // Add middleware for authorization
  kabam.mw.isAuthorized = function(actions) {
    return function(req, res, next) {
      var user_id = req.user._id;
      
      // If user is owner of model he can do everything
      if(req.model.owner.toString() === user_id) {
        return next();
      }

      lookupGroup(req, res, function() {
        req.group.isAuthorized(user_id, actions, function(err, authorized) {
          if(err) return res.send(err, 400);
          if(!authorized) return res.send(403);
          next();
        });
      });
    }
  };

  // Default/Root Group Type. Currently hard-coded by should be
  // defined in configuration
  kabam.groups.rootGroupType = "Organization";
  kabam.groups.GroupFactory = require('./group-factory')(kabam, GroupModel(kabam));
};
