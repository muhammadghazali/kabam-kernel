'use strict';
var async = require('async'),
  slugify2 = require('slugify2'),
  sanitaze = require('validator').sanitize; //used for dealing with xss injections in title


function factory(kabam) {
  var groupSchema = new kabam.mongoose.Schema({
      'name': {
        type: String,
        trim: true,
        index: true
      },
      'uri': {
        type: String,
        trim: true,
        index: true
      },
      //0 - world, 1 - school, 2 - course/association, 3 - group
      'tier': {type: Number, min: 0, max: 3},
      'schoolId': { type: kabam.mongoose.Schema.Types.ObjectId, ref: 'Group' },
      'courseId': { type: kabam.mongoose.Schema.Types.ObjectId, ref: 'Group' },

      'descriptionPublic': String,
      'descriptionForMembers': String,

      'members': [
        {
          'user': { type: kabam.mongoose.Schema.Types.ObjectId, ref: 'User' },
          'role': String
        }
      ],

      'isOpenToAll': {type: Boolean, default: false},
      'isOpenToParent': {type: Boolean, default: false}, //maybe we do not need it?
      'isHidden': {type: Boolean, default: false}
    },
    {
      toObject: { getters: true, virtuals: true }, //http://mongoosejs.com/docs/api.html#document_Document-toObject
      toJSON: { getters: true, virtuals: true }
    }
  );

  groupSchema.index({ name: 1, uri: 1, schoolId: 1, courseId: 1 });

  groupSchema.methods.findRoleInThisGroup = function (user) {
    var role = 'visitor';
    this.members.map(function (member) {
      if (typeof member.user === 'string') {
//        .toString() == user._id.toString()
//        console.log('string');
//        console.log(member.user);
//        console.log(user._id);
        role = member.role;
      } else {
//        console.log('obj');
//        console.log(member.user._id);
//        console.log(member.user.id);
//        console.log(user._id);
        if (typeof member.user._id === 'undefined') {
          if (member.user.toString() === user._id.toString()){
            role = member.role;
          }
        } else {
          if (member.user._id.equals(user._id)) {
            role = member.role;
          }
        }
      }
    });
    console.log(user.username + '\'s ROLE IS ' + role);
    return role;
  };

  /**
   * @ngdoc function
   * @name Group.checkRights
   * @description
   * Check role in this group, with respect to parent groups.
   * @param {User}  user to check rights against
   * @param {function} callback - function(err, stringWithRoleName) to be called on completion
   */

  groupSchema.methods.checkRights = function (user, callback) {
    var Group = this.constructor,
      _this = this;
    if (!user) {
      callback(null, 'visitor');//non authorized user is visitor
      return;
    }

    if (user.root) {
      callback(null, 'admin'); //roots are admins of every group
      return;
    }

    if (user.hasRole('hadmin')) {
      callback(null, 'admin'); //hierarchy admins are admins of every group
      return;
    }

    if (user.hasRole('helpdesk')) { //helpdesk is member of every group
      callback(null, 'member');
      return;
    }

    async.parallel({
      'inSchool': function (cb) {
        if (_this.schoolId) {
          Group.findOne({'_id': _this.schoolId}, function (err, schoolFound) {
            cb(err, schoolFound.findRoleInThisGroup(user));
          });
        } else {
          cb(null);
        }
      },
      'inCourse': function (cb) {
        if (_this.courseId) {
          Group.findOne({'_id': _this.courseId}, function (err, courseFound) {
            cb(err, courseFound.findRoleInThisGroup(user));
          });
        } else {
          cb(null);
        }
      },
      'inThisGroup': function (cb) {
        cb(null, _this.findRoleInThisGroup(user));
      }
    }, function (err, roles) {
      //school
      if (_this.tier === 1) {
        callback(err, roles.inThisGroup);
      }

      //for course // association
      //if user is admin of school, he is admin of every course of school
      if (_this.tier === 2) {
        if (roles.inSchool === 'admin' || roles.inThisGroup === 'admin') {
          callback(err, 'admin');
        } else {
          callback(err, roles.inThisGroup);
        }
      }

      //for students group
      //if user is admin of school/course, he is admin of every in course group
      if (_this.tier === 3) {
        if (roles.inSchool === 'admin' || roles.inCourse === 'admin' || roles.inThisGroup === 'admin') {
          callback(err, 'admin');
        } else {
          callback(err, roles.inThisGroup);
        }
      }
    });
  };

  /**
   * @ngdoc function
   * @name Group.invite
   * @param {User} user  object of user
   * @param {string} role - name of role to be assigned in this group
   * @param {function} callback is called on operation completed
   * @description
   * Invite user into group with desired role
   */
  groupSchema.methods.invite = function (user, role, callback) {
    var userIsNotMember = true,
      thisGroup = this;
    this.members.map(function (member) {
      if (member.user.toString() === user._id.toString()) { //we do not populate users here, so it works like it...
        userIsNotMember = false;
      }
    });
    if (userIsNotMember) {
      async.parallel({
        'addIdToGroup': function (cb) {
          thisGroup.members.push({
            'user': user._id,
            'role': role
          });
          thisGroup.save(cb);
        },
        'addIdToUser': function (cb) {
          var userHaveThisGroupId = false;
          user.groups.map(function (group) {
            if (group.toString() === thisGroup._id.toString()) { //we do not populate groups here, so it works like it...
              userHaveThisGroupId = true;
            }
          });

          if (userHaveThisGroupId) {
            cb(null);
          } else {
            user.groups.push(thisGroup._id);
            user.save(cb);
          }
        }
      }, callback);
    } else {
      callback(new Error('User is already in this group!'));
    }
  };

  /**
   * @ngdoc function
   * @name Group.inviteAdmin
   * @param {User} user  object of user
   * @param {function} callback is called on operation completed
   * @description
   * Invite user into group with role of Admin
   */
  groupSchema.methods.inviteAdmin = function (user, callback) {
    this.invite(user, 'admin', callback);
  };

  /**
   * @ngdoc function
   * @name Group.inviteMember
   * @param {User} user  object of user
   * @param {function} callback is called on operation completed
   * @description
   * Invite user into group with role of Member
   */
  groupSchema.methods.inviteMember = function (user, callback) {
    this.invite(user, 'member', callback);
  };

  /**
   * @ngdoc function
   * @name Group.ban
   * @param {User} user  object of user
   * @param {function} callback is called on operation completed
   * @description
   * Remove this user from members of this group
   */
  groupSchema.methods.ban = function (user, callback) {
    var i,
      thisGroup = this;
    async.parallel({
      'idInGroup': function (cb) {
        for (i = 0; i < thisGroup.members.length; i = i + 1) {
          if (thisGroup.members[i].user.toString() === user._id.toString()) {//we do not populate users here, so it works like it...
            thisGroup.members.splice(i, 1);
            break;
          }
        }
        thisGroup.save(cb);
      },
      'idInUser': function (cb) {
        for (i = 0; i < user.groups.length; i = i + 1) {
          if (user.groups[i].toString() === thisGroup._id.toString()) {//we do not populate groups here, so it works like it...
            user.groups.splice(i, 1);
            break;
          }
        }
        user.save(cb);
      }
    }, callback);
  };

  /**
   * @ngdoc function
   * @name Group.getParent
   * @param {function} callback  - function(err,groupFound) is called on operation completed
   * @description
   * Get group parent with respect to group tier
   */
  groupSchema.methods.getParent = function (callback) {
    var Group = this.constructor;
    switch (this.tier) {
    case 2:
      Group.findOne({'_id': this.schoolId, tier: 1}, callback);
      break;
    case 3:
      Group.findOne({'_id': this.courseId, tier: 2}, callback);
      break;
    default:
      callback(null, null);
    }
  };

  /**
   * @ngdoc function
   * @name Group.getChildren
   * @param {function} callback  - function(err,arrayOfGroupsFound) is called on operation completed.
   * @description
   * Get group children with respect to group tier
   */
  groupSchema.methods.getChildren = function (callback) {
    var Group = this.constructor;
    switch (this.tier) {
    case 1:
      Group.find({'schoolId': this._id, tier: 2}, callback);
      break;
    case 2:
      Group.find({'courseId': this._id, tier: 3}, callback);
      break;
    default:
      callback(null, null);
    }
  };

  /**
   * @ngdoc function
   * @name kabam.model.Group.findGroup
   * @param {String} schoolUri School URI
   * @param {String}  courseUri Course URI
   * @param {String}  groupUri Group URI
   * @param {function} callback  - function(err,groupFound) is called on operation completed
   * @description
   * Find the group from hierarchy level
   */
  groupSchema.statics.findGroup = function (schoolUri, courseUri, groupUri, callback) {
    var groups = this;

    if (schoolUri && !courseUri && !groupUri && typeof callback === 'function') {
      //we try to find school by school uri
      groups
        .findOne({'uri': schoolUri, 'tier': 1})
        .populate('members.user')
        .exec(function (err, schoolFound) {
          if (err) {
            callback(err);
          } else {
            if (schoolFound) {
              schoolFound.parentUri = null;
              schoolFound.childrenUri = '/h/' + schoolFound.uri;
              callback(null, schoolFound);
            } else {
              callback(null, null);
            }
          }
        });
      return;
    }

    if (schoolUri && courseUri && !groupUri && typeof callback === 'function') {
      async.waterfall(
        [
          function (cb) {
            groups.findOne({'uri': schoolUri, 'tier': 1})
              .populate('members.user')
              .exec(function (err, schoolFound) {
                cb(err, schoolFound);
              });
          },
          function (school, cb) {
            if (school && school._id) {//school found
              groups.findOne({'uri': courseUri, 'tier': 2, 'schoolId': school._id})
                .populate('members.user')
                .exec(function (err, courseFound) {
                  cb(err, school, courseFound);
                });
            } else {
              cb(null, null, null);
            }

          },
          function (school, course, cb) {
            if (course) {
              course.school = school;
              course.parentUri = '/h/' + school.uri;
              course.childrenUri = '/h/' + school.uri + '/' + course.uri;
              cb(null, course);
            } else {
              cb(null, null);
            }
          }
        ], callback);
      return;
    }

    if (schoolUri && courseUri && groupUri && typeof callback === 'function') {
      async.waterfall(
        [
          function (cb) {
            groups.findOne({'uri': schoolUri, 'tier': 1})
              .populate('members.user')
              .exec(function (err, schoolFound) {
                cb(err, schoolFound);
              });
          },
          function (school, cb) {
            if (school && school._id) {//school found
              groups.findOne({'uri': courseUri, 'tier': 2, 'schoolId': school._id})
                .populate('members.user')
                .exec(function (err, courseFound) {
                  cb(err, school, courseFound);
                });
            } else {
              cb(null, null, null);
            }
          },
          function (school, course, cb) {
            if (school && course && school._id && course._id) {
              groups.findOne({'uri': groupUri, 'tier': 3, 'schoolId': school._id, 'courseId': course._id})
                .populate('members.user')
                .exec(function (err, groupFound) {
                  cb(err, school, course, groupFound);
                });
            } else {
              cb(null, null, null, null);
            }
          },
          function (school, course, group, cb) {
            if (group) {
              group.school = school;
              group.course = course;
              group.parentUri = '/h/' + school.uri + '/' + course.uri;
              group.childrenUri = null;
              cb(null, group);
            } else {
              cb(null, null);
            }
          }
        ], callback);
      return;
    }
  };

  /**
   * @ngdoc function
   * @name Group.createChildGroup
   * @param {title} title - human readable title of group to be created
   * @param {function} callback  - function(err,groupCreated) is called on operation completed
   * @description
   * Creates child group for current group. Empty, without members
   */
  groupSchema.methods.createChildGroup = function (title, callback) {
    var Group = this.constructor;
    var thisGroup = this;
    if (thisGroup.tier < 3) {
      Group.create({
        'title': sanitaze(title).xss(),
        'uri': slugify2(title), //it is sanitazed... i think
        'tier': (thisGroup.tier - 1),
        'schoolId': ((thisGroup.tier === 1) ? thisGroup._id : thisGroup.schoolId),
        'courseId': ((thisGroup.tier === 1) ? null : thisGroup._id)
      }, callback);
    } else {
      callback(new Error('This is group of 3 tier - it cannot have child groups'));//todo maybe more descriptive err message
    }
  };
  //compatibility with rest plugin

  //function to work with kabam-plugin-rest - only root can work with REST api to see all groups todo - maybe we can change it in future
  groupSchema.statics.getForUser = function (user, parameters, callback) {
    if (user && user.root) {
      if (typeof parameters === 'object') {
        this.find(parameters)
          .limit(parameters.limit || 10)
          .skip(parameters.offset || 0)
          .populate('members.user')
          .exec(callback);
      } else {
        callback(new Error('Wrong parameters'));
      }
    } else {
      callback(new Error('Access denied!'));
    }
  };

  //function to work with kabam-plugin-rest - only root can create groups by REST api
  groupSchema.statics.canCreate = function (user, callback) {
    callback(null, (user && user.root));
  };

  //function to work with kabam-plugin-rest - admins and members can read this group parameters by REST api
  groupSchema.methods.canRead = function (user, callback) {
    var thisGroup = this;
    thisGroup.checkRights(user, function (err, roleFound) {
      if (err) {
        callback(err);
      } else {
        callback(null, roleFound === 'admin' || roleFound === 'member');
      }
    });
  };

  //function to work with kabam-plugin-rest - admins can change this group parameters by REST api
  groupSchema.methods.canWrite = function (user, callback) {
    var thisGroup = this;
    thisGroup.checkRights(user, function (err, roleFound) {
      if (err) {
        callback(err);
      } else {
        callback(null, roleFound === 'admin');
      }
    });
  };

  return groupSchema;
}

exports.name = 'kabam-core-models-group';
exports.model = {
  Group: factory
};
