var util = require("util");
var noop = function() {};

module.exports = function(GroupModel, UserModel) {
  function Group(data) {
    var _this = this;
    this.data = {};
    this.members = [];

    if(
      typeof data === "object" &&
      !(data instanceof Array)
    ) {
      // canonical fields
      this.set("_id", data._id);
      this.set("name", data.name);
      this.set("description", data.description);
      this.set("group_type", this.constructor.name);
      this.set("owner", data.owner);
      this.set("parent_id", data.parent_id);
      this.set("custom", data.custom)

      // custom fields
      var FIELDS = this.constructor.FIELDS;
      FIELDS.forEach(function(field) {
        if(data[field]) {
          _this.setCustom(field, data[field]);  
        }
      });
    } else {
      throw new Error("Can't create Group instance");
    }
  }

  Group.find = function(query, callback) {
    if(!callback) {
      callback = query;
      query = {};
    }
    query.group_type = this.name;
    GroupModel.find(query, function(err, groups) {
      callback(err, clean(groups));
    });
  };

  Group.findById = function(id, callback) {
    var _this = this;
    GroupModel.findById(id, function(err, group) {
      var data = clean(group);
      var g = new _this(data);
      g._id = data._id.toString();
      // Populate members
      g.getMembers(function(err, members) {
        g.members = members;
        callback(err, g);
      });
    });
  };

  Group.prototype.set = function(field, value) {
    this.data[field] = value;
    return true;
  };

  Group.prototype.setCustom = function(field, value) {
    this.data.custom = this.data.custom || {};
    this.data.custom[field] = value;
    return true;
  };

  Group.prototype.get = function(field) {
    return this.data[field];
  };

  Group.prototype.getMembers = function(callback) {
    var _this = this;

    UserModel.find({ groups: this._id }, function(err, users) {
      if(err) return callback(err);

      var members = clean(users, 
        { include: ["firstName", "lastName", "username", "roles", "email", "gravatar"] });
      
      members.forEach(function(m) {
        m.roles = m.roles.filter(function(r) {
          var split = r.split(":");
          return split[1] === _this._id;
        })
        .map(function(r) {
          return r.split(":").pop();
        });
      });
      
      callback(null, members);
    });
  };

  Group.prototype.addMember = function(member, callback) {
    var _this = this;

    var ROLES = this.constructor.ROLES;

    if(ROLES.indexOf(member.access) === -1) {
      return callback("GroupType "+_this.group_type+" does not accept role "+member.access);
    }

    UserModel.findById(member.member_id, function(err, user) {
      if(err) return callback(err);

      var roleLevel = ROLES.indexOf(member.access);
      var removeRoles = ROLES/*.slice(roleLevel+1)*/
        .map(function(role) {
          return (_this.get("group_type")+":"+_this.get("_id")+":"+role).toLowerCase();
        });

      user.revokeRoles(removeRoles, function() {
        var role = (_this.get("group_type")+":"+_this.get("_id")+":"+member.access).toLowerCase();
        if(user.groups.indexOf(_this._id) === -1) {
          user.groups.push(_this._id);
          // Why need to save here if grantRole will save?
          user.save(noop);
        }
        user.grantRole(role, callback);

        _this.onAddMember && _this.onAddMember(member);
      });
    });
  };

  Group.prototype.authorize = function(user_id, actions, callback) {
    var _this = this;

    var roles = [];  
    Object.keys(this._permissions).filter(function(p) {
      return actions.indexOf(p) > -1;
    })
    .map(function(action) {
      return _this._permissions[action].map(function(r) {
        var role = _this.group_type.toLowerCase()+":";
        role += _this._id+":";
        role += r;
        return role;
      });
    })
    .forEach(function(rolesPerAction) {
      rolesPerAction.forEach(function(role) {
        roles.push(role);
      });
    });

    UserModel.findOne({ roles: { "$in": roles }}, function(err, user) {
      if(err) return callback(err);
      callback(null, !!user);
    });
  };

  Group.prototype.removeMembers = function(members) {
  };

  Group.prototype.save = function(callback) {
    var model = new GroupModel(this.data);
    model.save(function(err, o) {
      callback(err, clean(o));
    });
  };

  Group.prototype.restify = function(app) {
    var This = this.constructor;
    var _this = this;

    var resource = this.constructor.toLowerCase()+"s";
    var parent_resource = This.parent && This.parent.constructor.toLowerCase()+"s";

    var url = function(path) {
      var _url = "/";
      if(!path || !path.length) {
        _url += resource;
      } else {
        _url += path.join("/");
      }
      return _url;
    };

    var user = req.session.user;
    var groups = user.groups[group_type];

    function error(err, res) {
      res.send(err, 400);
    }

    function authorize(req, res, next) {

    }

    function parentLookup(req, res, next) {
      if(!This.parent) return next();

      var group_id = req.body.parent_id || req.params.parent_id;
      if(!group_id) {
        return res.send("Should contain parent_id", 400);
      }

      This.parent.findById(function(err, parent) {
        if(err) return error(err, res);
        if(!parent) return res.send("Parent does not exist", 400);
        next();
      });
    }

    function lookup(req, res, next) {
      This.findById(req.params.id, function(err, group) {
        if(err) return error(err, res);
        if(!group) return res.send(404);
        res.send(clean(group));
      });
    }

    function create(req, res, next) {
      var model = new This(req.body);
      model.save(function(err, group) {
        if(err) return error(err, res);
        res.send(clean(group), 201);
      });
    }

    function update(req, res, next) {
      This.update({ "_id": req.params.id }, req.body, function(err, n) {
        if(err) return error(err, res);
        res.send({ "ok": n });
      });
    }

    function remove(req, res, next) {
      This.update({ "_id": req.params.id }, { "removed": 1 }, function(err, res) {
        if(err) return error(err, res);
        res.send({ "ok": 1 });
      });
    }

    app.get(url(), function(req, res) {
      This.find(
        {
          "_id": { "$in": groups }
        },
        function(err, groups) {
          if(err) return error(err, res);
          res.send(clean(groups));
        }
      );
    });

    app.post(url(), parentLookup, create);
    app.get(url([":id"]), lookup);
    app.put(url([":id"]), update);
    app.del(url([":id"]), remove);

    if(This.parent) {
      app.get(
        url([parent_resource, ":parent_id", resource]),
        parentLookup,
        function(req, res) {
          This.find(
            { parent_id: req.params.parent_id },
            function(err, group) {
              if(err) return error(err, res);
              res.send(clean(group));
            }
          );
        }
      );

      app.get(
        url([parent_resource, ":parent_id", resource, ":id"]),
        parentLookup,
        lookup
      );

      app.post(
        url([parent_resource, ":parent_id"]),
        parentLookup, 
        create
      );

      app.put(
        url([parent_resource, ":parent_id", resource, ":id"]),
        parentLookup,
        update
      );
    }
  };

  function GroupFactory(name, o) {
    // TODO: validate `name` format
    if(!name) throw Error("Must define a name for this Group");
    if(!o.roles) throw Error("Must define roles for this Group");

    var G = new Function(
      "Group",
      "return function "+name+"(o){ Group.call(this, o); }"
    )(Group);

    G.ROLES = o.roles;
    G.FIELDS = o.fields||[];
    G.PARENT = o.parent;

    // Inherit static methods
    Object.keys(Group).forEach(function(method) {
      if(typeof Group[method] === "function")
        G[method] = Group[method];
    });
    // Inherit instance (prototype) methods
    util.inherits(G, Group);

    return G;
  }

  return GroupFactory;
}

// Removes unwanted fields from Mongoose model object
function clean(o, opts) {
  opts = opts || { include: [] };

  function _clean(_o) {
    _o = _o.toObject();
    if(opts.include.length) {
      opts.include.push("_id");
      Object.keys(_o).forEach(function(k) {
        if(opts.include.indexOf(k) === -1) {
          delete _o[k];
        }
      });
    }
    delete _o.__v;
    return _o;
  }

  if(!o) {
    return o;
  } else if(o instanceof Array) {
    o = o.map(function(_o) {
      return _clean(_o);
    });
  } else {
    o = _clean(o);
  }
  return o;
}
