/*jshint immed: false */
'use strict';
var async = require('async'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  createKabam = require('./helpers').createKabam,
  port = Math.floor(2000 + 1000 * Math.random()),
  should = require('should');

describe('group-manager testing', function () {
  var kernel, config,
    tester, joed, jsmith, harry,
    org1, org2,
    course1, course2,
    section1, section2;

  before(function (done) {

    config = {
      'HOST_URL': 'http://localhost:' + port,
      'MONGO_URL': 'mongodb://localhost/kabam_test',
      'SECRET': 'ever_the_youngest_of_Mosirai_knows_that_you_cannot_put_humans_hide_on_a_bear'
    };

    tester = {
      email: 'tester@monimus.com',
      username: 'tester',
      root: true
    };

    joed = {
      email: 'joed@monimus.com',
      username: 'joed'
    };

    jsmith = {
      email: 'jsmith@monimus.com',
      username: 'jsmith'
    };

    harry = {
      email: 'harry@monimus.com',
      username: 'harry'
    };

    var models = [
      require('./models/organization'),
      require('./models/course'),
      require('./models/section'),
      require('./models/event')
    ];

    createKabam(port, config, models, function(err, _kernel) {
      if (err) { return done(err); }
      kernel = _kernel;
      kernel.model.User.create(tester)
        .then(function(savedTester) {
          tester = savedTester;
          return kernel.model.User.create(joed);
        })
        .then(function(savedJoed) {
          joed = savedJoed;
          return kernel.model.User.create(jsmith);
        })
        .then(function(savedJsmith) {
          jsmith = savedJsmith;
          return kernel.model.User.create(harry);
        })
        .then(function(savedHarry) {
          harry = savedHarry;
          done();
        });
      ;
      return null;
    });
  });

  after(function(done) {
    kernel.stop();
    done();
  });

  describe('group manager initialization', function() {
    it('initialize the group model properly', function() {
      should.exist(kernel.mw);
      should.exist(kernel.groups);
      should.exist(kernel.groups.GroupFactory);
      should.exist(kernel.model.Organization);
      should.exist(kernel.model.Course);
      should.exist(kernel.model.Section);
      should.exist(kernel.model.Event);
      kernel.model.Organization.should.have.properties('find', 'findById');
    });

    it('Organization can create proper instances', function(done) {
      org1 = new kernel.model.Organization({
        name: 'Test Group',
        description: 'Test Description',
        group_type: 'Organization',
        owner: tester,
        parent_id: null,
        custom: null
      });
      org1.save(function(err, org) {
        if (err) { throw err; }
        org.should.have.properties('name', 'description', 'group_type', '_permissions');
        org1 = org;
        done();
      });
    });

    it('Course can create proper instances', function(done) {
      var course = new kernel.model.Course({
        name: 'Test Course',
        description: 'Test Description',
        group_type: 'Course',
        owner: tester,
        parent_id: org1,
        custom: null
      });

      course.save(function(err, savedCourse) {
        if (err) { throw err; }
        savedCourse.should.have.properties('name', 'description', 'group_type', '_permissions');
        course1 = savedCourse;
        done();
      });
    });

    it('Section can create proper instances', function(done) {
      var section = new kernel.model.Section({
        name: 'Test Section',
        description: 'Test Description',
        group_type: 'Section',
        owner: tester,
        parent_id: course1,
        custom: {
          start_date: new Date('2013-08-17'),
          end_date: new Date('2013-11-16')
        }
      });

      section.save(function(err, savedSection) {
        if (err) { throw err; }
        savedSection.should.have.properties('name', 'description', 'group_type', '_permissions');
        savedSection.custom.should.have.properties('start_date', 'end_date');
        section1 = savedSection;
        done();
      });
    });

  });

  describe('default allows settings', function() {
    it('guest cannot access group data');
    it('guest cannot access user data');
    it('guest cannot access event data');
    it('owner can access group data');
    it('owner can access user data');
    it('owner can access event data');
  });

  describe('adding user to groups and setting roles', function() {
    it('can add user to Organization as admin');
    it('can add user to Organization as manager');
    it('can add user to Organization as member');
    it('can add user to Course as admin');
    it('can add user to Course as manager');
    it('can add user to Course as member');
    it('can add user to Section as instructor');
    it('can add user to Section as assistant');
    it('can add user to Section as student');
    it('organization admin can access organization data');
    it('organization manager can access organization data except delete');
    it('organization member can only view organization data');
    it('admin of another organization cannot access organization data');
    it('manager of another organization cannot access organization data');
    it('member of another organization cannot access organization data');
    it('course admin can access course data');
    it('course manager can access course data except delete');
    it('course member can only view course data');
    it('admin of another course cannot access course data');
    it('manager of another course cannot access course data');
    it('member of another course cannot access course data');
    it('section instructor can access section data');
    it('section assistant can access section data except delete');
    it('section student can only view section data');
    it('instructor of another section cannot access section data');
    it('assistance of another section cannot access section data');
    it('student of another section cannot access section data');
  });

  describe('add new resources', function() {
    it('can add organization event');
    it('can add course event');
    it('can add section event');
    it('organization admin can access organization event');
    it('organization manager can access organization event except delete');
    it('organization member can only view organization event');
    it('admin of another organization cannot access organization event');
    it('manager of another organization cannot access organization event');
    it('member of another organization cannot access organization event');
    it('course admin can access course event');
    it('course manager can access course event except delete');
    it('course member can only view course event');
    it('admin of another course cannot access course event');
    it('manager of another course cannot access course event');
    it('member of another course cannot access course event');
    it('section instructor can access section event');
    it('section assistant can access section event except delete');
    it('section student can only view section event');
    it('instructor of another section cannot access section event');
    it('assistance of another section cannot access section event');
    it('student of another section cannot access section event');
  });

  describe('permission removal', function() {
  });

  describe ('role removal', function() {
  });

  describe('resource removal', function() {
  });

  describe('user-role removal', function() {
  });
});
