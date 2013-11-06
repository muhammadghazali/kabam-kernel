var util = require("util");
var async = require("async");
var noop = function() {};

module.exports = function(kabam, GroupModel) {

  function Group(data) {
    if(!data || typeof data !== "object" || data instanceof Array)
      throw new Error("Wrong parameters. Can't create Group instance");
    }

    if(data.constructor.name === "model") {
      this.model = data;
      this._id = data._id;
    } else {
      this.model = new kabam.model[This.name](data);
    }
    data._permissions || this.model.set("_permissions", This.PERMISSIONS);

    this.owner_id = this.model.get("owner_id");
    this.parent_id = this.model.get("parent_id");
    this.group_type = this.constructor.name;    
    this._permissions = this.model.get("_permissions");
    this.members = [];
  }

  Group.find = function(query, callback) {
    var T = transform.bind(this);

    if(!callback) {
      callback = query;
      query = {};
    }
    query.group_type = this.name;

    GroupModel.find(query, function(err, groups) {
      callback(err, T(groups));
    });
  };

  Group.findById = function(id, callback) {
    var T = transform.bind(this);

    GroupModel.findById(id, function(err, group) {
      var data = T(group);
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
    this.model.set(field, value);
  };

  Group.prototype.get = function(field) {
    return this.model.get(field);
  };

  Group.prototype.getMembers = function(callback) {
    var _this = this;

    var User = kabam.model.User;
    User.find({ groups: this._id }, function(err, users) {
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

  Group.prototype.hasAdmin = function(user) {
    var adminRole = this.group_type.toLowerCase+":"+this._id+":admin";
    user._id.toString() === this.owner_id.toString()
    return (
      // Is owner ...
      user._id.toString() === this.owner_id.toString()
      // ... or is admin
      || user.roles.indexOf(adminRole) > -1
    );
  };

  Group.prototype.getMembership = function(user) {
    var group = this;
    return user.roles.filter(function(role) {
      return role.match(new RegExp(group._id));
    })
    .map(function(role) {
      return role.split(":").pop();
    })
    .shift();
  };

  Group.prototype.addMember = function(member, callback) {
    var _this = this;

    var ROLES = this.constructor.ROLES;

    if(ROLES.indexOf(member.access) === -1) {
      return callback("GroupType '"+_this.group_type+"' does not accept role '"+member.access+ "'");
    }

    var User = kabam.model.User;
    User.findById(member.member_id, function(err, user) {
      if(err) return callback(err);
      if(user.groups.indexOf(_this._id) > -1) return callback();

      var removeRoles = ROLES.map(function(role) {
        return (_this.get("group_type")+":"+_this.get("_id")+":"+role).toLowerCase();
      });

      user.revokeRoles(removeRoles, function() {
        _addMember.call(_this, user, member.access, 
          _addToParent.bind(_this, user, callback));
      });
    });

    function _addMember(user, access, _callback) {
      if(user.groups.indexOf(this._id) > -1) return _callback();
      
      var role = (this.get("group_type")+":"+this.get("_id")+":"+access).toLowerCase();
      user.groups.push(this._id);
      // Why need to save here if grantRole will save?
      user.save(function() {
        user.grantRole(role, _callback);
      });
    }

    function _addToParent(user, _callback) {
      var group = this;
      var nextParent = this.parent_id;

      async.until(
        function() { return !nextParent; }, 
        __addToParent,
        _callback
      );

      function __addToParent(__callback) {
        var ParentGroup = kabam.model[group.constructor.PARENT];
        ParentGroup.findById(nextParent, function(err, parent) {
          group = parent;
          nextParent = parent.parent_id;
          _addMember.call(parent, user, "member", __callback);
        });
      }      
    }
  };

  Group.prototype.isAuthorized = function(user_id, actions, callback) {
    // If user is owner of Group he can do everything
    if(user_id.toString() === this.owner_id.toString()) {
      return callback(null, true);
    }

    // Get all parent Groups for cascading permissions
    var roles = [];
    addRoles(this);
    getParent(this);
    function getParent(group) {
      if(group.parent_id) {
        var Group = kabam.model[group.group_type];
        Group.findById(group.parent_id, function(err, parent) {
          addRoles(parent);
          getParent(parent);
        });
      } else {
        _authorize();
      }
    }    

    // Build all roles that have permissions to perform 'actions'
    // on this group
    function addRoles(group) {
      Object.keys(group._permissions).filter(function(p) {
        return actions.indexOf(p) > -1;
      })
      .map(function(action) {
        // By convention 'admin' role can do everything, 
        // so it does not need to be explicitly defined
        // in the permissions matrix
        group._permissions[action].unshift("admin");
        
        return group._permissions[action].map(function(r) {
          var role = group.group_type.toLowerCase()+":";
          role += group._id+":";
          role += r;
          return role;
        });
      })
      .forEach(function(rolesPerAction) {
        rolesPerAction.forEach(function(role) {
          roles.push(role);
        });
      });
    }

    function _authorize() {
      // Check if user has at least one of the roles
      var User = kabam.model.User;
      User.findOne({ "_id": user_id, roles: { "$in": roles }}, function(err, user) {
        if(err) return callback(err);
        callback(null, !!user);
      });      
    }
  };

  Group.prototype.getChildren = function(callback) {
    var children = [];
    _getChildren([this]);

    function _getChildren(groups) {
      async.map(
        groups, 
        function(group, _callback) {
          GroupModel.find({ parent_id: group._id }, _callback);
        }, 
        _nextChildren
      );
    }

    function _nextChildren(err, results) {
      var next = [];
      results.forEach(function(r) {
        next = next.concat(r);
      });
      children = children.concat(next);

      if(next.length) {
        _getChildren(next, _nextChildren);
      } else {
        callback(null, children);
      }        
    }
  };

  Group.prototype.remove = function(callback) {
  };

  Group.prototype.removeMembers = function(members, callback) {
    var User = kabam.model.User;
    
    // First off get all children groups from which
    // these members will need to be removed from ...
    var removeGroups = [this];
    (function getChildren(_callback) {
      _getChildren([this]);

      function _getChildren(groups) {
        async.map(
          groups, 
          function(group, __callback) {
            GroupModel.find({ parent_id: group._id }, __callback);
          }, 
          _nextChildren
        );
      }

      function _nextChildren(err, results) {
        var next = [];
        results.forEach(function(r) {
          next = next.concat(r);
        });
        removeGroups = removeGroups.concat(next);

        if(next.length) {
          _getChildren(next, _nextChildren);
        } else {
          _callback();
        }        
      }
    })
    .call(this,
      // ... then remove all members from these groups
      removeMembers.bind(this));

    function removeMembers() {
      async.each(members, function(user_id, _callback) {
        User.findById(user_id, function(err, user) {
          if(err) return _callback(err);
          if(!user) return _callback();
          removeFromGroups(user, _callback);
        });
      }, callback);      
    }

    function removeFromGroups(user, _callback) {
      async.eachSeries(removeGroups, _removeFromGroup, _callback);

      function _removeFromGroup(group, __callback) {
        var group_type = group.get("group_type");
        var Group = kabam.model[group_type];

        // Remove from group
        user.groups = user.groups.filter(function(g) {
          return group._id.toString() !== g.toString();
        });
        // Remove group roles
        Group.ROLES.forEach(function(r) {
          var role = group_type.toLowerCase()+":"+group._id+":"+r;
          var _index = user.roles.indexOf(role);
          if(_index > -1) user.roles.splice(_index, 1);
        });
        user.save(__callback);
      }
    }
  };

  Group.prototype.save = function(callback) {
    var T = transform.bind(this.constructor);

    this.model.save(function(err, o) {
      callback(err, T(o));
    });
  };

  Group.restify = function(app, options) {
    var This = this;

    options = options || {};
    var includeChildren = options.includeChildren || [];

    // This will be used eventually for enabling 'urlAlias'
    // option
    /*var resource = (function() {
      return (
        options.urlAlias 
        || This.name.toLowerCase()
      )+"s";
    })();*/

    var resource = This.name.toLowerCase()+"s";
    var parent_resource = This.PARENT && This.PARENT.toLowerCase()+"s";

    var url = function(path) {
      var _url = "/api/";
      if(!path || !path.length) {
        _url += resource;
      } else {
        _url += path.join("/");
      }
      return _url;
    };

    function error(err, res) {
      res.send(err, 400);
    }

    function authorize(actions) {
      return function(req, res, next) {
        var user = req.user;
        var group;
        if(req.params.id) {
          group = req.group;
        } else if(req.params.parent_id || req.body.parent_id) {
          group = req.parent;
        } else {
          group = req.rootGroup;
        }
        group.isAuthorized(user._id, actions, function(err, authorized) {
          if(!authorized) return res.send(403);
          next();
        });
      }
    }

    function parentLookup(req, res, next) {
      if(!This.PARENT) return next();

      var group_id = 
        (req.group && req.group.parent_id)
        || req.body.parent_id 
        || req.params.parent_id;
      
      if(!group_id) {
        return res.send("Should contain parent_id", 400);
      }

      var ParentGroup = kabam.model[This.PARENT];
      ParentGroup.findById(group_id, function(err, parent) {
        if(err) return error(err, res);
        if(!parent) return res.send("Parent does not exist", 404);
        req.parent = parent;
        next();
      });
    }

    function rootGroup(req, res, next) {
      req.user.getRootGroup(function(err, group) {
        req.rootGroup = group;
        next();
      });
    }

    function lookup(req, res, next) {
      var group_id = req.params.id;// || req.user.rootGroup;

      if(group_id) {
        This.findById(group_id, function(err, group) {
          if(err) return error(err, res);
          if(!group) return res.send(404);
          req.group = group;
          parentLookup(req, res, next);
        });        
      } else {
        parentLookup(req, res, next);
      }
    }
    
    function read(req, res) {
      if(includeChildren.length) {
        includeChildren.forEach(function(modelType) {
          var ChildGroup = kabam.model[modelType];
          if(ChildGroup) {
            ChildGroup.find({ parent_id: req.group._id }, function(err, children) {
              var name = ChildGroup.name.toLowerCase()+"s";
              req.group[name] = children;
              res.send(req.group);
            });
          }
        });
      } else {
        res.send(req.group);
      }
    }

    function create(req, res, next) {
      var data = req.body;
      data.owner = req.user._id;

      var model = new This(data);
      model.save(function(err, group) {
        if(err) return error(err, res);
        res.send(group, 201);
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

    function addMember(req, res, next) {
      // Only admins can add admins
      if(req.body.access === "admin" && !req.group.hasAdmin(req.user)) {
        return res.send(403);
      }

      var group_type = req.group_type;
      This.findById(req.params.id, function(err, group) {
        if(err) return error(err, res);
        if(!group) return res.send(404);

        group.addMember({
          member_id: req.body.member_id,
          access: req.body.access
        }, function(err) {
          if(err) return res.send(400);
          res.send({ ok: 1 });
        });
      });
    };

    function removeMembers(req, res, next) {
      var members = req.body.members || [];
      if(!members.length) return res.send({ ok: 1 });
      req.group.removeMembers(members, function(err, ok) {
        if(err) return res.send(500);
        res.send({ ok: 1 });
      });
    }

    function getChildren(req, res, next) {
      req.group.getChildren(function(err, children) {
        res.send(children);
      });
    }

    // GET /:group_type
    // e.g. GET /organizations
    app.get(url(), rootGroup, function(req, res) {
      var groups = req.user.groups;
      This.find(
        {
          "$or": [
            { "_id": { "$in": groups } },
            { "owner": req.user._id }
          ]
        },
        function(err, groups) {
          if(err) return error(err, res);
          res.send(groups);
        }
      );
    });
    // GET /:group_type/:id
    // e.g. GET /organizations/123
    app.get(url([resource, ":id"]), lookup, authorize(["view"]), read);
    // POST /:group_type
    // e.g. POST /organizations
    app.post(url(), rootGroup, lookup, authorize(["create"]), create);
    // PUT /:group_type/:id
    // e.g. PUT /organizations/123
    app.put(url([resource, ":id"]), lookup, authorize(["view"]), update);
    // DELETE /:group_type/:id
    // e.g. DELETE /organizations/123
    app.del(url([resource, ":id"]), lookup, authorize(["view"]), remove);
    // POST /:group_type/:id/members
    // e.g. POST /organizations/123/members
    // Add a member to this group
    app.post(
      url([resource, ":id", "members"]),
      lookup,
      authorize(["create", "addMember"]),
      addMember
    );
    // DELETE /:group_type/:id/members
    // e.g. DELETE /organizations/123/members { members: [user_id] }
    // Remove members from this group
    app.del(
      url([resource, ":id", "members"]),
      lookup,
      authorize(["create", "addMember"]),
      removeMembers
    );
    // GET /:group_type/:id/children
    // e.g. GET /organizations/123/children
    // Get all children groups
    app.get(
      url([resource, ":id", "members"]),
      lookup,
      authorize(["create"]),
      getChildren
    );

    if(This.PARENT) {
      app.get(
        url([parent_resource, ":parent_id", resource]),
        lookup,
        authorize(["view"]),
        function(req, res) {
          This.find(
            { parent_id: req.params.parent_id },
            function(err, group) {
              if(err) return error(err, res);
              res.send(group);
            }
          );
        }
      );

      app.get(
        url([parent_resource, ":parent_id", resource, ":id"]),
        lookup,
        authorize(["view"]),
        read
      );

      app.post(
        url([parent_resource, ":parent_id", resource]),
        lookup,
        authorize(["create"]),
        create
      );

      // POST /:parent_group_type/:parent_id/:group_type/:id/members
      // e.g. POST /organizations/123/courses/456/members
      // Add a member to this group
      app.post(
        url([parent_resource, ":parent_id", resource, ":id", "members"]),
        lookup,
        authorize(["create", "addMember"]),
        create
      );

      // DELETE /:parent_group_type/:parent_id/:group_type/:id/members
      // e.g. DELETE /organizations/123/courses/456/members
      // Remove members from this group
      app.del(
        url([parent_resource, ":parent_id", resource, ":id", "members"]),
        lookup,
        authorize(["create", "addMember"]),
        removeMembers
      );

      app.put(
        url([parent_resource, ":parent_id", resource, ":id"]),
        lookup,
        authorize(["edit"]),
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
      "return function "+name+"(args){ Group.call(this, args); }"
    )(Group);

    G.ROLES = o.roles;
    G.FIELDS = o.fields||[];
    G.PARENT = o.parent;
    G.PERMISSIONS = o.permissions;

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
  } else if(Array.isArray(o)) {
    o = o.map(function(_o) {
      return _clean(_o);
    });
  } else {
    o = _clean(o);
  }
  return o;
}

// Transforms mongoose model to Group model
function transform(m) {
  var groups;
  if(Array.isArray(models)) {
    return models.map(_transform);
  } else {
    return _transform(m);
  }

  function _transform() {

  }
}
