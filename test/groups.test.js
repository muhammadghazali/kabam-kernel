/*jshint immed: false */
'use strict';
var async = require('async'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  createKabam = require('./helpers').createKabam,
  port = Math.floor(2000 + 1000 * Math.random());

require('should');

describe('groups testing', function () {
  var kabam, config;
  before(function (done) {

    config = {
      'HOST_URL': 'http://localhost:' + port,
      'MONGO_URL': 'mongodb://localhost/kabam_test',
      'SECRET': 'ever_the_youngest_of_Mosirai_knows_that_you_cannot_put_humans_hide_on_a_bear'
    };

    createKabam(port, config, function(err, _kabam){
      if(err){return done(err);}
      kabam = _kabam;
      done();
    });
  });
//*/
  describe('general test', function () {
    describe('creating group hierarchy for users', function () {
      var shared;
      before(function (done) {
        async.parallel({
          'userRoot': function (cb) {
            kabam.model.User.create({
              'username': 'groups_test_root',
              'email': 'groups_test_root@mywebclass.org',
              'root': true
            }, cb);
          },
          'userAdmin': function (cb) {
            kabam.model.User.create({
              'username': 'groups_test_admin',
              'email': 'groups_test_admin@mywebclass.org',
              'root': false
            }, cb);
          },
          'userMember': function (cb) {
            kabam.model.User.create({
              'username': 'groups_test_member',
              'email': 'groups_test_member@mywebclass.org',
              'root': false
            }, cb);
          },
          'userVisitor': function (cb) {
            kabam.model.User.create({
              'username': 'groups_test_visitor',
              'email': 'groups_test_visitor@mywebclass.org',
              'root': false
            }, cb);
          },
          'testSchool': function (cb) {
            kabam.model.Group.create({
              'title': 'testSchool',
              'uri': 'testSchool',
              'tier': 1
            }, cb);
          },
          'testCourse': function (cb) {
            kabam.model.Group.create({
              'title': 'testCourse',
              'uri': 'testCourse',
              'tier': 2
            }, cb);
          },
          'testGroup': function (cb) {
            kabam.model.Group.create({
              'title': 'testGroup',
              'uri': 'testGroup',
              'tier': 3
            }, cb);
          }
        }, function (err, obj) {
          if (err) throw err;
          shared = obj;
          async.parallel({
            'testSchoolAddAdmin': function (cb) {
              shared.testSchool.inviteAdmin(shared.userAdmin, cb);
            },
//            'testSchoolAddMember': function (cb) {
//              setTimeout(function () { //http://stackoverflow.com/questions/17499089/versionerror-no-matching-document-found-error-on-node-js-mongoose
//                shared.testSchool.inviteMember(shared.userMember, cb);
//              }, 300);
//            },
            'testCourseAddSchool': function (cb) {
              shared.testCourse.schoolId = shared.testSchool._id.toString();
              shared.testCourse.save(cb);
            },
//            'testCourseAddMember': function (cb) {
//              setTimeout(function () { //http://stackoverflow.com/questions/17499089/versionerror-no-matching-document-found-error-on-node-js-mongoose
//                shared.testCourse.inviteMember(shared.userMember, cb);
//              }, 300);
//            },
            'testGroupAddSchool': function (cb) {
              shared.testGroup.schoolId = shared.testSchool._id.toString();
              shared.testGroup.courseId = shared.testCourse._id.toString();
              shared.testGroup.save(cb);
            }
          }, function (err2, obj2) {
            if (err2) throw err2;
            done();
          });
        });
      });

      describe('root is a admin of every group', function () {
        var v;
        before(function (done) {
          async.parallel({
            'school': function (cb) {
              shared.testSchool.checkRights(shared.userRoot, cb);
            },
            'course': function (cb) {
              shared.testCourse.checkRights(shared.userRoot, cb);
            },
            'group': function (cb) {
              shared.testGroup.checkRights(shared.userRoot, cb);
            }
          }, function (err, obj) {
            if (err) throw err;
            v = obj;
            done();
          });
        });
        it('root have role of admin in school', function () {
          v.school.should.be.equal('admin');
        });
        it('root have role of admin in course', function () {
          v.course.should.be.equal('admin');
        });
        it('root have role of admin in grouop', function () {
          v.group.should.be.equal('admin');
        });
      });

      describe('userAdmin is admin of every group in school hierarchy',function(){
        var v;
        before(function (done) {
          async.parallel({
            'school': function (cb) {
              kabam.model.Group.findGroup('testSchool', null, null, function (err, groupFound) {
                groupFound.checkRights(shared.userAdmin, cb);
              });
            },
            'course': function (cb) {
              kabam.model.Group.findGroup('testSchool', 'testCourse', null, function (err, groupFound) {
                groupFound.checkRights(shared.userAdmin, cb);
              });
            },
            'group': function (cb) {
              kabam.model.Group.findGroup('testSchool', 'testCourse', 'testGroup', function (err, groupFound) {
                groupFound.checkRights(shared.userAdmin, cb);
              });
            }
          }, function (err, obj) {
            if (err) throw err;
            v = obj;
            done();
          });
        });
        it('userAdmin have role of admin in school', function () {
          v.school.should.be.equal('admin');
        });
        it('userAdmin have role of admin in course', function () {
          v.course.should.be.equal('admin');
        });
        it('userAdmin have role of admin in grouop', function () {
          v.group.should.be.equal('admin');
        });
      });

      describe('userMember is member of every group in school hierarchy',function(){
        it('have to be created');
      });

      describe('userVisitor is a visitor of every group', function () {
        var v;
        before(function (done) {
          async.parallel({
            'school': function (cb) {
              kabam.model.Group.findOne({'uri': 'testSchool'},
                function (err, testSchool) {
                  testSchool.checkRights(shared.userVisitor, cb);
                });
            },
            'course': function (cb) {
              kabam.model.Group.findOne({'uri': 'testCourse'},
                function (err, testCourse) {
                  testCourse.checkRights(shared.userVisitor, cb);
                });
            },
            'group': function (cb) {
              kabam.model.Group.findOne({'uri': 'testGroup'},
                function (err, testGroup) {
                  testGroup.checkRights(shared.userVisitor, cb);
                });
            }
          }, function (err, obj) {
            if (err) throw err;
            v = obj;
            done();
          });
        });

        it('userVisitor have role of visitor in school', function () {
          v.school.should.be.equal('visitor');
        });
        it('userVisitor have role of visitor in course', function () {
          v.course.should.be.equal('visitor');
        });
        it('userVisitor have role of visitor in group', function () {
          v.group.should.be.equal('visitor');
        });
      });


      after(function (done) {
        async.parallel({
          'userRoot': function (cb) {
            shared.userRoot.remove(cb);
          },
          'useAdmin': function (cb) {
            shared.userAdmin.remove(cb);
          },
          'useMember': function (cb) {
            shared.userMember.remove(cb);
          },
          'userVisitor': function (cb) {
            shared.userVisitor.remove(cb);
          },
          'testSchool': function (cb) {
            shared.testSchool.remove(cb);
          },
          'testCourse': function (cb) {
            shared.testCourse.remove(cb);
          },
          'testGroup': function (cb) {
            shared.testGroup.remove(cb);
          }
        }, done);
      });
    });
  });

  describe('invite test', function () {
    it('have to be created');
  });

  describe('ban test', function () {
    it('have to be created');
  });

  after(function (done) {
    kabam.stop();
    done();
  });
});
