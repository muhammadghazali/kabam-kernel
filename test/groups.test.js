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

  it('test have to be created soon');

  after(function (done) {
    kabam.stop();
    done();
  });
});
