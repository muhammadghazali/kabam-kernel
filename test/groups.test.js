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
    /*/
     describe('creating group hierarchy for users', function() {
     var shared;
     before(function(done){
     async.parallel({
     'userRoot':function(cb){
     kabam.model.User.create({
     'username': 'groups_test_root',
     'email': 'groups_test_root@mywebclass.org',
     'root': true
     },cb);
     },
     'userAdmin':function(cb){
     kabam.model.User.create({
     '_id': '522d996a8680bf210f000001',
     'username': 'groups_test_root',
     'email': 'groups_test_root@mywebclass.org',
     'root': false
     },cb);
     },
     'useMember':function(cb){
     kabam.model.User.create({
     '_id': '522d996a8680bf210f000002',
     'username': 'groups_test_member',
     'email': 'groups_test_member@mywebclass.org',
     'root': false
     },cb);
     },
     'userVisitor':function(cb){
     kabam.model.User.create({
     '_id': '522d996a8680bf210f000003',
     'username': 'groups_test_visitor',
     'email': 'groups_test_visitor@mywebclass.org',
     'root': false
     },cb);
     },
     'testSchool':function(cb){},
     'testCourse':function(cb){},
     'testGroup':function(cb){}
     }, function(err,obj){
     shared = obj;
     done(err);
     });
     });

     it('have to be created');

     after(function(done){
     async.parallel({
     'userRoot':function(cb){
     shared.userRoot.remove(cb);
     },
     'useAdmin':function(cb){
     shared.userAdmin.remove(cb);
     },
     'useMember':function(cb){
     shared.useMember.remove(cb);
     },
     'userVisitor':function(cb){
     shared.userVisitor.remove(cb);
     },
     'testSchool':function(cb){
     shared.testSchool.remove(cb);
     },
     'testCourse':function(cb){
     shared.testCourse.remove(cb);
     },
     'testGroup':function(cb){
     shared.testGroup.remove(cb);
     }
     }, done);
     });
     });
     //*/
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
