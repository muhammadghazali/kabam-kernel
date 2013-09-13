'use strict';
var async = require('async');
exports.name = 'group';
exports.initFunction = function (kabam) {
  var GroupsSchema = new kabam.mongoose.Schema({
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

  GroupsSchema.index({ name: 1, uri: 1, schoolId: 1, courseId: 1 });

  GroupsSchema.methods.findRoleInThisGroup = function (user) {
    var role = 'visitor';
    this.members.map(function (member) {
      if (member.user.toString() === user._id.toString()) {
        role = member.role;
      } else {
        if (member.user._id && member.user._id.toString() === user._id.toString()) {
          role = member.role;
        }
      }
    });
    return role;
  };

  /**
   * @ngdoc function
   * @name Group.checkRights
   * @description
   * Check role in this group, with respect to parent groups.
   * @param {User}  user to check rights against
   * @param {function} callback(err,stringWithRoleName) to be called on completion
   */

  GroupsSchema.methods.checkRights = function (user, callback) {
    var thisGroup = this;
    if (!user) {
      callback(null, 'visitor');//non authorized user is visitor
      return;
    }

    if (user.root) {
      callback(null, 'admin'); //hierarchy admins are admins of every group
      return;
    }

    if (user.hasRole('hadmin')) {
      callback(null, 'admin'); //roots are admins of every group
      return;
    }

    if (user.hasRole('helpdesk')) { //helpdesk is member of every group
      callback(null, 'member');
      return;
    }

    async.parallel({
      'inSchool': function (cb) {
        if (this.school_id) {
          Groups.findOne({'_id': this.school_id}, function (err, schoolFound) {
            cb(err, schoolFound.findRoleInThisGroup(user));
          });
        } else {
          cb(null);
        }
      },
      'inCourse': function (cb) {
        if (this.course_id) {
          Groups.findOne({'_id': this.course_id}, function (err, courseFound) {
            cb(err, courseFound.findRoleInThisGroup(user));
          });
        } else {
          cb(null);
        }
      },
      'inThisGroup': function (cb) {
        cb(null, thisGroup.findRoleInThisGroup(user));
      }
    }, function (err, roles) {
      //school
      if (thisGroup.tier === 1) {
        callback(err, roles.inThisGroup);
      }

      //for course // association
      //if user is admin of school, he is admin of every course of school
      if (thisGroup.tier === 2) {
        if (roles.inSchool === 'admin' || roles.inThisGroup === 'admin') {
          callback(err, 'admin');
        } else {
          callback(err, roles.inThisGroup);
        }
      }

      //for students group
      //if user is admin of school/course, he is admin of every in course group
      if (thisGroup.tier === 3) {
        if (roles.inSchool === 'admin' || roles.inCourse === 'admin' || roles.inThisGroup === 'admin') {
          callback(err, 'admin');
        } else {
          callback(err, roles.inThisGroup);
        }
      }
    });
  };


  //invitations
  GroupsSchema.methods.invite = function (user, role, callback) {
    var userIsNotMember = true;
    this.members.map(function (member) {
      if (member.user.toString() === user._id.toString()) { //we do not populate users here, so it works like it...
        userIsNotMember = false;
      }
    });
    if (userIsNotMember) {
      this.members.push({
        'user': user._id,
        'role': role
      });
      this.save(callback);
    } else {
      callback(new Error('User is already in this group!'));
    }
  };
  GroupsSchema.methods.inviteAdmin = function (usernameOrEmailOrUserObject, callback) {
    this.invite(usernameOrEmailOrUserObject, 'admin', callback);
  };

  GroupsSchema.methods.inviteMember = function (usernameOrEmailOrUserObject, callback) {
    this.invite(usernameOrEmailOrUserObject, 'member', callback);
  };
  //invitations

  GroupsSchema.methods.ban = function (user, callback) {
    var i;
    for (i = 0; i < this.members.length; i = i + 1) {
      if (this.members[i].user.toString() === user._id.toString()) {//we do not populate users here, so it works like it...
        this.members.splice(i, 1);
        break;
      }
    }
    this.save(callback);
  };



  GroupsSchema.methods.getParent = function (callback) {
    switch (this.tier) {
    case 2:
      Groups.findOne({'_id': this.school_id, tier: 1}, callback);
      break;
    case 3:
      Groups.findOne({'_id': this.course_id, tier: 2}, callback);
      break;
    default:
        callback(null, null);
    }
  };

  GroupsSchema.methods.getChildren = function (callback) {
    switch (this.tier) {
    case 1:
      Groups.find({'school_id': this._id, tier: 2}, callback);
      break;
    case 2:
      Groups.find({'course_id': this._id, tier: 3}, callback);
      break;
    default:
      callback(null, null);
    }
  };

    GroupsSchema.statics.findGroup = function (schoolUri, courseUri, groupUri, callback) {
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
                groups.findOne({'uri': courseUri, 'tier': 2, 'school_id': school._id})
                  .populate('members.user')
                  .exec(function (err, courseFound) {
                    cb(err, school, courseFound);
                  });
              } else {
                cb(null, null, null)
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
                groups.findOne({'uri': courseUri, 'tier': 2, 'school_id': school._id})
                  .populate('members.user')
                  .exec(function (err, courseFound) {
                    cb(err, school, courseFound);
                  });
              } else {
                cb(null, null, null)
              }
            },
            function (school, course, cb) {
              if (school && course && school._id && course._id) {
                groups.findOne({'uri': groupUri, 'tier': 3, 'school_id': school._id, 'course_id': course._id})
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

    var Groups = kabam.mongoConnection.model('groups', GroupsSchema);
    return Groups;
  };
