/*jshint immed: false */
'use strict';
var should = require('should'),
  async = require('async'),
  KabamKernel = require('./../index.js'),
  port = Math.floor(2000 + 1000 * Math.random());

describe('groups testing', function () {
  var kabam;
  before(function (done) {

    kabam = KabamKernel({
      'hostUrl': 'http://localhost:' + port,
      'mongoUrl': 'mongodb://localhost/mwc_dev',
      'disableCsrf': true // NEVER DO IT!
    });

    kabam.on('started', function (evnt) {
      done();
    });
    // kabam.usePlugin(require('./../index.js'));
    kabam.start(port);
  });

  describe('general test', function () {
    //*/
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
              'title': 'testCourse',
              'uri': 'testCourse',
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
            'testSchoolAddMember': function (cb) {
              setTimeout(function(){ //http://stackoverflow.com/questions/17499089/versionerror-no-matching-document-found-error-on-node-js-mongoose
                shared.testSchool.inviteMember(shared.userMember, cb);
              }, 300);
            },
            'testCourseAddSchool': function (cb) {
              shared.testCourse.schoolId = shared.testSchool._id;
              shared.testCourse.save(cb);
            },
            'testCourseAddMember': function (cb) {
              setTimeout(function(){ //http://stackoverflow.com/questions/17499089/versionerror-no-matching-document-found-error-on-node-js-mongoose
                shared.testCourse.inviteMember(shared.userMember, cb);
              }, 300);
            },
            'testGroupAddSchool': function (cb) {
              shared.testGroup.schoolId = shared.testSchool._id;
              shared.testGroup.courseId = shared.testCourse._id;
              shared.testGroup.save(cb);
            }
          }, function(err2,obj2){
            if(err2) throw err2;
            done();
          });
        });
      });

      it('have to be created');

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
