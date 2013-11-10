var util = require("util");
var async = require("async");
var noop = function() {};

module.exports = function(kabam, BaseGroup) {
  function Group(data) {
    if(!data || typeof data !== "object" || data instanceof Array) {
      throw new Error("Wrong parameters. Can't create Group instance");
    }

    var This = this.constructor;
    var _this = this;
    var GroupModel = kabam.mongoConnection.model(This.name+"Group");
    var model;

    if(data.constructor.name === "model") {
      model = data;
    } else {
      model = new GroupModel(data);
      model.set("group_type", This.name);
      data._permissions || model.set("_permissions", This.PERMISSIONS);
    }

    Object.keys(model.toObject()).forEach(function(p) {
      Object.defineProperty(_this, p, {
        enumerable: true,
        get: model.get.bind(model, p),
        set: model.set.bind(model, p)
      });
    });

    Object.defineProperty(_this, "model", {
      get: function() { return model }
    });
  }

  Group.prototype.toObject = function() {
    var o = {};
    var _this = this;
    Object.getOwnPropertyNames(this).forEach(function(f) {
      o[f] = _this[f];
    });
    return o;
  };

  Group.prototype.toString = function() {
    return JSON.stringify(this.toObject(), null, 2);
  }

  Group.find = function(query, callback) {
    var T = transform.bind(this);
    if(!callback) {
      callback = query;
      query = {};
    }
    query.group_type = this.name;
    query.removed = 0;

    BaseGroup.find(query, function(err, groups) {
      callback(err, T(groups));
    });
  };

  Group.findById = function(id, callback) {
    var T = transform.bind(this);

    BaseGroup.findById(id, function(err, group) {
      if(!group || group.removed) {
        return callback();
      }

      var g = T(group);
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
          return split[1] === _this._id.toString();
        })
        .map(function(r) {
          return r.split(":").pop();
        });
      });

      callback(null, members);
    });
  };

  Group.prototype.hasAdmin = function(user) {
    var _id = this._id.toString();
    var adminRole = this.group_type.toLowerCase+":"+_id+":admin";
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
      return role.match(new RegExp(group._id.toString()));
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
          BaseGroup.find({ parent_id: group._id, removed: false },
            _callback);
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
        if(!children.length) return callback(null, []);
        var Child = kabam.model[children[0].get("group_type")];
        var T = transform.bind(Child);
        callback(null, T(children));
      }
    }
  };

  Group.prototype.remove = function(callback) {
    // Removing a group will also remove all children groups.
    // Group is not deleted from DB but marked as 'removed'.
    // All users and content with membership to the Group will
    // keep it, but the removed group won't ever be showed.
    var removeGroups = function(err, groups) {
      groups.unshift(this);
      async.each(groups, function(g, cb) {
        g.removed = true;
        g.save(cb);
      }, callback);
    }.bind(this);

    this.getChildren(removeGroups);
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
            BaseGroup.find({ parent_id: group._id, removed: false },
              __callback);
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

    // TODO: review whether it's convenient to also do parent lookup here
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
      data.owner_id = req.user._id;

      var group = new This(data);
      group.save(function(err, group) {
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
      var T = transform.bind(This);
      var groups = req.body.groups;
      if(!groups || !Array.isArray(groups) || !groups.length) return next();

      This.find({ "_id": { "$in": groups } }, checkAccess);

      function checkAccess(err, groups) {
        async.map(groups, function(g, cb) {
          g.isAuthorized(req.user._id, ["create"], cb);
        }, function(err, isAuthorized) {
          if(err) return res.send(400);
          if(isAuthorized.indexOf(false) > -1) return res.send(403);
          removeGroups(groups);
        });
      }

      function removeGroups(groups) {
        async.each(groups, function(g, cb) {
          g.remove(cb);
        }, function() {
          res.send({ ok: 1 });
        });
      }
    }

    function removeOne(req, res, next) {
      req.send({ err: "Not implemented" }, 401);
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
            { "owner_id": req.user._id }
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
    app.del(url([resource, ":id"]), lookup, authorize(["create"]), removeOne);

    // DELETE /:group_type
    // For removing groups in bulk
    // e.g. DELETE /organizations
    app.del(url(), remove);

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
      url([resource, ":id", "children"]),
      lookup,
      authorize(["manager"]),
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

  function groupFactory(name, o) {
    if(!name) throw Error("Must define a name for this Group");
    if(!name.match(/^[_a-zA-Z]+[a-zA-Z0-9_]*$/)) throw Error("Wrong name for a Group. It can only contain letters, numbers and _, and should not start with a number");
    if(!o.roles) throw Error("Must define roles for this Group");

    // Dynamically create a 'Class' named after 'name': the name of the group type
    var G = new Function(
      "Group",  // This refers to the Group variable passed as parameter
                // to 'new Function', so it exists in the scope of the
                // constructor of the Class we're creating here
      "return function "+name+"(args){ Group.call(this, args); }"
    )(Group);

    G.ROLES = o.roles;
    G.FIELDS = o.fields||{};
    G.PARENT = o.parent;
    G.PERMISSIONS = o.permissions;

    // Extend the base Group schema to include custom properties
    var GSchema = BaseGroup.schema.extend(G.FIELDS);
    kabam.mongoConnection.model(name+"Group", GSchema);

    // Inherit static methods
    Object.keys(Group).forEach(function(method) {
      if(typeof Group[method] === "function")
        G[method] = Group[method];
    });
    // Inherit instance (prototype) methods
    util.inherits(G, Group);

    return G;
  }

  return groupFactory;
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
// This function is called bound to the Group constructor
function transform(m) {
  var groups;
  if(Array.isArray(m)) {
    return m.map(_t.bind(this));
  } else {
    return _t.call(this, m);
  }

  function _t(o) {
    return new this(o);
  }
}
