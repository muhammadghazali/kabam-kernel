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
      username: 'tester'
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
        owner_id: tester._id,
        parent_id: null,
        custom: null
      });
      org1.should.be.an.instanceOf(kernel.model.Organization);

      org1.save(function(err, org) {
        if (err) { throw err; }
        org.should.have.properties('_id', 'name', 'description', 'group_type', 'owner_id', 'parent_id', '_permissions');
        org.should.be.an.instanceOf(kernel.model.Organization);
        org.name.should.equal('Test Group');
        org.description.should.equal('Test Description');
        org.group_type.should.equal('Organization');
        org.owner_id.should.equal(tester._id);
        should.not.exist(org.parent_id);
        org1 = org;
        done();
      });

    });

    it('Course can create proper instances with _static_ and regular object methods', function(done) {
      var course = new kernel.model.Course({
        name: 'Test Course',
        description: 'Course Test Description',
        group_type: 'Course',
        owner_id: joed._id,
        parent_id: org1._id,
        custom: null
      });
      course.should.be.an.instanceOf(kernel.model.Course);
      kernel.model.Course.multiply(3).should.eql(6);

      course.save(function(err, savedCourse) {
        if (err) { throw err; }
        savedCourse.should.have.properties('_id', 'name', 'description', 'group_type', 'owner_id', 'parent_id', '_permissions');
        savedCourse.should.be.an.instanceOf(kernel.model.Course);
        savedCourse.name.should.equal('Test Course');
        savedCourse.description.should.equal('Course Test Description');
        savedCourse.group_type.should.equal('Course');
        savedCourse.owner_id.should.equal(joed._id);
        savedCourse.parent_id.should.equal(org1._id);
        savedCourse.lowerName().should.equal('test course');
        course1 = savedCourse;
        done();
      });
    });

    it('Section can create proper instances', function(done) {
      var section = new kernel.model.Section({
        name: 'Test Section',
        description: 'Section Test Description',
        group_type: 'Section',
        owner_id: jsmith._id,
        parent_id: course1._id,
        start_date: new Date('2013-08-17'),
        end_date: new Date('2013-11-16')
      });
      section.should.be.an.instanceOf(kernel.model.Section);

      section.save(function(err, savedSection) {
        if (err) { throw err; }
        savedSection.should.have.properties('_id', 'name', 'description', 'group_type', 'owner_id', 'parent_id', '_permissions');
        savedSection.should.be.an.instanceOf(kernel.model.Section);
        savedSection.name.should.equal('Test Section');
        savedSection.description.should.equal('Section Test Description');
        savedSection.group_type.should.equal('Section');
        savedSection.owner_id.should.equal(jsmith._id);
        savedSection.parent_id.should.equal(course1._id);
        savedSection.start_date.should.eql(new Date('2013-08-17'));
        savedSection.end_date.should.eql(new Date('2013-11-16'));
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
