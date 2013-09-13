/*jshint immed: false */
'use strict';
var should = require('should'),
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

  describe('general test',function(){
    describe('creating group hierarchy for users',function(){
    /* we create 3 users, and 3 groups.
     * first user is root in all groups
     * second one is member of 3 groups
     * third one visitor
     * testing inheritance for adminship and membership.
     */
      it('have to be created');
    });
  });

  describe('invite test', function(){
    it('have to be created');
  });

  describe('ban test', function(){
    it('have to be created');
  });

  after(function (done) {
    kabam.stop();
    done();
  });
});
