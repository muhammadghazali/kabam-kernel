/*jshint immed: false */
'use strict';
var async = require('async'),
  mongoose = require('mongoose'),
  kabamKernel = require('./../index.js'),
  createKabam = require('./helpers').createKabam,
  port = Math.floor(2000 + 1000 * Math.random()),
  should = require('should');

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function personFactory(name) {
  return {
    email: name + '@monimus.com',
    username: name
  };
}

describe('group-manager testing', function () {
  var kernel, config,
    people = {},
    org1, org2,
    course1, course2,
    section1, section2,
    eventorg1, eventcourse2, eventsection1,
    names = ['tester', // owner of org1
             'joed',   // owner of course1, member of org1
             'jsmith', // owner of section1, member of org1 and course1
             'harry',  // not a member of org1
             'frodo',  // org1 admin
             'sam',    // org1 manager
             'merry',  // org1 member
             'pippin', // org2 member
             'bilbo',  // course1 admin
             'gandalf',// course1 manager
             'aragorn',// course1 member
             'gimli',  // course2 owner / admin
             'legolas',// section1 instructor
             'boromir',// section1 assistant
             'faramir',// section1 student
             'gollum'  // section2 student
            ];

  names.forEach(function(name) {
    people[name] = personFactory(name);
  });

  this.timeout(5000);

  before(function (done) {

    config = {
      'HOST_URL': 'http://localhost:' + port,
      'MONGO_URL': 'mongodb://localhost/kabam_test',
      'SECRET': 'ever_the_youngest_of_Mosirai_knows_that_you_cannot_put_humans_hide_on_a_bear'
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

      var createUser = function(name, cb) {
        kernel.model.User.create(people[name], function(err, user) {
          if (err) { return cb(err); }
          people[name] = user;
          return cb();
        });
      };

      async.each(names, createUser, done);

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
      should.exist(kernel.groups.groupFactory);
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
        owner_id: people.tester._id,
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
        org.owner_id.should.equal(people.tester._id);
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
        owner_id: people.joed._id,
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
        savedCourse.owner_id.should.equal(people.joed._id);
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
        owner_id: people.jsmith._id,
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
        savedSection.owner_id.should.equal(people.jsmith._id);
        savedSection.parent_id.should.equal(course1._id);
        savedSection.start_date.should.eql(new Date('2013-08-17'));
        savedSection.end_date.should.eql(new Date('2013-11-16'));
        section1 = savedSection;
        done();
      });
    });

    it('Event can create proper instances', function(done) {
      var event = new kernel.model.Event({
        name: 'Test Event',
        description: 'Event Test Description',
        owner_id: people.jsmith._id,
        group_id: section1._id,
        startDate: new Date('2013-08-20'),
        endDate: new Date('2013-11-19')
      });
      event.should.be.an.instanceOf(kernel.model.Event);

      event.save(function(err, savedEvent) {
        if (err) { throw err; }
        savedEvent.should.have.properties('_id', 'name', 'description', 'owner_id', 'group_id', 'startDate', 'endDate');
        savedEvent.should.be.an.instanceOf(kernel.model.Event);
        savedEvent.name.should.equal('Test Event');
        savedEvent.description.should.equal('Event Test Description');
        savedEvent.owner_id.should.equal(people.jsmith._id);
        savedEvent.group_id.should.equal(section1._id);
        savedEvent.startDate.should.eql(new Date('2013-08-20'));
        savedEvent.endDate.should.eql(new Date('2013-11-19'));
        eventorg1 = savedEvent;
        done();
      });
    });

  });

  describe('default allows settings in initial state', function() {

    before(function(done) {
      done();
    });

    it('anonymous cannot access group data');
    it('anonymous cannot access user data');
    it('anonymous cannot access event data');

    it('owner can access group data', function(done) {
      people.tester.can('create', org1)
        .then(function(authorized) {
          authorized.should.be.true;
          return people.joed.can('create', course1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.jsmith.can('create', section1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.tester.can('view', org1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.joed.can('view', course1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.jsmith.can('view', section1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.tester.can('delete', org1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.joed.can('delete', course1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.jsmith.can('delete', section1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          done();
        });
    });

    it('owner can access user data', function(done) {
      people.tester.can('view', people.joed)
        .then(function(authorized) {
          authorized.should.be.true;
          return people.tester.can('view', people.jsmith);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.joed.can('view', people.jsmith);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          done();
        });
    });

    it('owner can access event data', function(done) {
      people.jsmith.can('view', eventorg1)
        .then(function(authorized) {
          authorized.should.be.true;
          return people.joed.can('view', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.tester.can('view', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          done();
        });
    });

    it('non-member cannot access group data', function(done) {
      people.harry.can('view', org1)
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.harry.can('view', course1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.harry.can('view', section1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          done();
        });
    });

    it('non-member cannot access user data', function(done) {
      people.harry.can('view', people.tester)
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.harry.can('view', people.joed);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.harry.can('view', people.jsmith);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          done();
        });
    });

    it('non-member cannot access event data', function(done) {
      people.harry.can('view', eventorg1)
        .then(function(authorized) {
          authorized.should.not.be.true;
          done();
        });
    });
  });

  describe('adding user to groups and setting roles', function() {

    it('can add user to Organization as admin', function(done) {
      people.frodo.access = 'admin';
      org1.addMember(people.frodo, function(err, user) {
        should.exist(user);
        // check properties;
        // people.frodo = user;
        done();
      });
    });

    it('can add user to Organization as manager', function(done) {
      people.sam.access = 'manager';
      org1.addMember(people.sam, function(err, user) {
        should.exist(user);
        // check properties;
        // people.sam = user;
        done();
      });
    });

    it('can add user to Organization as member', function(done) {
      people.merry.access = 'member';
      org1.addMember(people.merry, function(err, user) {
        should.exist(user);
        // check properties;
        // people.merry = user;
        done();
      });
    });

    it('can add user to Course as admin', function(done) {
      people.bilbo.access = 'admin';
      course1.addMember(people.bilbo, function(err, user) {
        should.exist(user);
        // check properties;
        // people.bilbo = user;
        done();
      });
    });

    it('can add user to Course as manager', function(done) {
      people.gandalf.access = 'manager';
      course1.addMember(people.gandalf, function(err, user) {
        should.exist(user);
        // check properties;
        // people.gandalf = user;
        done();
      });
    });

    it('can add user to Course as member', function(done) {
      people.aragorn.access = 'member';
      course1.addMember(people.aragorn, function(err, user) {
        should.exist(user);
        // check properties;
        // people.aragorn = user;
        done();
      });
    });

    it('can add user to Section as instructor', function(done) {
      people.legolas.access = 'instructor';
      section1.addMember(people.legolas, function(err, user) {
        should.exist(user);
        // check properties;
        // people.legolas = user;
        done();
      });
    });

    it('can add user to Section as assistant', function(done) {
      people.boromir.access = 'assistant';
      section1.addMember(people.boromir, function(err, user) {
        should.exist(user);
        // check properties;
        // people.boromir = user;
        done();
      });
    });

    it('can add user to Section as student', function(done) {
      people.faramir.access = 'student';
      section1.addMember(people.faramir, function(err, user) {
        should.exist(user);
        // check properties;
        // people.faramir = user;
        done();
      });
    });

    it('organization admin can access organization data', function(done) {
      people.frodo.can('create', org1)
        .then(function(authorized) {
          authorized.should.be.true;
          return people.frodo.can('view', org1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.frodo.can('delete', org1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.frodo.can('create', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.frodo.can('view', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.frodo.can('delete', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          done();
        });
    });

    it('organization manager can access organization data except delete', function(done) {
      people.sam.can('create', org1)
        .then(function(authorized) {
          authorized.should.be.true;
          return people.sam.can('view', org1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.sam.can('delete', org1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.sam.can('create', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.sam.can('view', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.sam.can('delete', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          done();
        });
    });

    it('organization member can only view organization data', function(done) {
      people.merry.can('create', org1)
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.merry.can('view', org1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.merry.can('delete', org1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.merry.can('create', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          return people.merry.can('view', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.be.true;
          return people.merry.can('delete', eventorg1);
        })
        .then(function(authorized) {
          authorized.should.not.be.true;
          done();
        });
    });

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
