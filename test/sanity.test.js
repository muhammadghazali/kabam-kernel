/*jshint immed: false */

var should = require('should'),
  async = require('async'),
  mwcCore = require('./../index.js'),
  events = require('events'),
  config = require('./../example/config.json').development,
  request = require('request');




describe('sanity test', function () {



  describe('MWC throws errors when we try to call extending function with strange arguments', function () {

    it('throws proper error for MWC.extendCore("i am pineapple!");', function () {
      (function () {
        var MWC = new mwcCore(config);
        MWC.extendCore('i am pineapple!');
      }).should.throw('MWC.extendCore requires argument of function(core){...}');
    });

    it('throws proper error for MWC.extendModel("i am pineapple!");', function () {
      (function () {
        var MWC = new mwcCore(config);
        MWC.extendModel('i am pineapple!');
      }).should.throw('MWC.extendModel requires arguments of string of "modelName" and function(core){...}');
    });

    it('throws proper error for MWC.extendApp("i am pineapple!");', function () {
      (function () {
        var MWC = new mwcCore(config);
        MWC.extendApp('i am pineapple!');
      }).should.throw('Wrong arguments for setAppParameters(arrayOrStringOfEnvironments,settingsFunction)');
    });

    it('throws proper error for MWC.extendMiddlewares("i am pineapple!");', function () {
      (function () {
        var MWC = new mwcCore(config);
        MWC.extendMiddlewares('i am pineapple!');
      }).should.throw('Wrong arguments for function MWC.setAppMiddlware(environmentArrayOrStrings, [path], settingsFunction(core){...})');
    });

    it('throws proper error for MWC.extendRoutes("i am pineapple!");', function () {
      (function () {
        var MWC = new mwcCore(config);
        MWC.extendRoutes('i am pineapple!');
      }).should.throw('Wrong argument for MWC.extendAppRoutes(function(core){...});');
    });


  });

});