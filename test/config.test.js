'use strict';
var
  os = require('os'),
  // jshint unused: false
  should = require('should'),
  configBuilder = require('../lib/config-builder');

var kernel;
describe('Config Builder', function(){
  it('should accept config and schemes', function(){
    var config = configBuilder({OLOLO:42}, {
      somePlugin:{
        config: {
          OLOLO:{default:0}
        }
      }
    }).config;
    config.should.have.property('OLOLO', 42);
  });
  describe('schemes', function(){
    describe('default', function(){
      it('should provide default value', function(){
        var config = configBuilder({}, {
          somePlugin:{
            config: {
              OLOLO:{default:0}
            }
          }
        }).config;
        config.should.have.property('OLOLO', 0);
      });

      it('should provide default value for a nested object', function(){
        var config = configBuilder({}, {
          somePlugin: {
            config: {
              'PASSPORT.FACEBOOK_SECRET':{default:42}
            }
          }
        }).config;
        config.should.have.property('PASSPORT');
        config.PASSPORT.should.have.property('FACEBOOK_SECRET', 42);
      });

      describe('default as a function', function(){
        it('should be called and result is saved to config', function(){
          var config = configBuilder({}, {
            somePlugin:{
              config: {
                OLOLO: {
                  default:function(){
                    return 42;
                  }
                },
                'PASSPORT.FACEBOOK_SECRET': {
                  default: function(){
                    return 21;
                  }
                }
              }
            }
          }).config;
          config.should.have.property('OLOLO', 42);
          config.should.have.property('PASSPORT');
          config.PASSPORT.should.have.property('FACEBOOK_SECRET', 21);
        });
        it('should have access to other config values', function(){
          var config = configBuilder({}, {
            somePlugin: {
              config: {
                OLOLO: {
                  default: function(){
                    return 9 * this.TROLOLO;
                  }
                },
                TROLOLO: {
                  default: 2
                }
              }
            }
          }).config;
          config.should.have.property('OLOLO', 18);
        });
      });
    });
    describe('env', function(){
      it('should read a value from environment variable with the same name', function(){
        process.env.OLOLO = '21';
        var config = configBuilder({}, {
          somePlugin:{
            config: {
              OLOLO: {
                env: 'OLOLO'
              }
            }
          }
        }).config;
        config.should.have.property('OLOLO', '21');
        delete process.env.OLOLO;
      });
      it('should have higher priority than default value', function(){
        process.env.OLOLO = 42;
        var config = configBuilder({}, {
          somePlugin: {
            config: {
              OLOLO: {
                default: 21,
                env: 'OLOLO'
              }
            }
          }
        }).config;
        config.should.have.property('OLOLO', '42');
        delete process.env.OLOLO;
      });
      it('should have higher priority than config value', function(){
        process.env.OLOLO = 21;
        var config = configBuilder({
          OLOLO: 42
        }, {
          somePlugin:{
            config: {
              OLOLO: {
                env: 'OLOLO'
              }
            }
          }
        }).config;
        delete process.env.OLOLO;
        config.should.have.property('OLOLO', '21');
      });
      it('should read environment variable for nested object', function(){
        process.env.PASSPORT_FACEBOOK_SECRET = 42;
        var config = configBuilder({}, {
          somePlugin: {
            config: {
              'PASSPORT.FACEBOOK_SECRET': {
                default: 21,
                env: 'PASSPORT_FACEBOOK_SECRET'
              }
            }
          }
        }).config;
        config.should.have.property('PASSPORT');
        config.PASSPORT.should.have.property('FACEBOOK_SECRET', '42');
        delete process.env.PASSPORT_FACEBOOK_SECRET;
      });
    });
    describe('parse', function(){
      it('should return a parsed value', function(){
        var config = configBuilder({
          OLOLO: '42'
        }, {
          somePlugin:{
            config: {
              'OLOLO': {
                parse: function(value){
                  return parseInt(value, 10);
                }
              }
            }
          }
        }).config;
        config.should.have.property('OLOLO', 42);
      });
      it('should resolve all values at build', function(){
        // even though we do not use any config values it should throw an error
        // which would mean that config values were resolved
        // jshint immed: false
        (function(){
          var config = configBuilder({
            OLOLO: '42'
          }, {
            'some-plugin': {
              config: {
                'OLOLO': {
                  parse: function(value){
                    throw new Error('Should be thrown at build');
                  }
                }
              }
            }
          });
        }).should.throw();
      });
    });
    describe('disabling plugins', function(){
      it('should disable a plugin if its config key has no default value', function(){
        var build = configBuilder({}, {
          somePlugin:{
            config: {
              OLOLO: {
                env: 'OLOLO'
              }
            }
          }
        });
        build.should.have.property('disabledPlugins');
        build.disabledPlugins.should.have.property('somePlugin');
        build.disabledPlugins.somePlugin.should.be.instanceof(Error);
      });
    });
  });
});