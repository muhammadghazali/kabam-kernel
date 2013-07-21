var vows=require('vows'),
    assert = require('assert'),
    mwc_core = require('./../index.js'),
    events = require('events'),
    config = require('./../example/config.json');

var MWC=new mwc_core(config);
MWC.listen(3000);

vows.describe('mwc_core')
    .addBatch({
        'Testing mwc_core exposed objects': {
            'topic':  MWC,
            'it can emit and listen to events': function (topic) {
                assert.isFunction(topic.emit);
                assert.isFunction(topic.on);
            },
            'it exposes redis client': function (topic) {
                assert.isObject((topic.redisClient));
                assert.isFunction(topic.redisClient.set);
                assert.isFunction(topic.redisClient.get);
                assert.isFunction(topic.redisClient.info);
                assert.isFunction(topic.redisClient.auth);
            },
            'it exposes mongoose model of users':function(topic){
                assert.isObject(topic.MODEL);
                assert.isFunction(topic.MODEL.Users);
            },
            'it exposes mongoose model of documents':function(topic){
                assert.isObject(topic.MODEL);
                assert.isFunction(topic.MODEL.Documents);
            },
            'it exposes an ExpressJS application':function(topic){
                assert.isFunction(topic.app);
                assert.equal(topic.app.get('port'),3000);
                assert.isFunction(topic.app.listen);
                assert.isFunction(topic.app.use);
                assert.isFunction(topic.app.get);
                assert.isFunction(topic.app.post);
                assert.isFunction(topic.app.delete);
            }
        },
        'Testing mwc_core event emmiting system':{
            'topic':function(){
                var promise=new(events.EventEmitter),
                    mwc = MWC;

                mwc.on('error',function(err){
                    promise.emit('error',err);
                });

                mwc.on('ping',function(message){
                    promise.emit('success',message);
                });

                setTimeout(function(){
                    mwc.emit('ping','pong');
                },100);

                return promise;
            },
            'it emits and catches events by itself':function(err,message){
                assert.isNull(err);
                assert.equal(message,'pong');
            }
        },
        'Testing mwc_core mongoose model of users':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing mwc_core mongoose model of documents':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing mwc_core express application':{
            'topic':{},
            'to be iplemented':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.extendCore() function':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Create this test!');
            }
        },
        'Testing MWC.setAppMiddlewares() function':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.extendAppRoutes() function':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.usePlugin(object) function':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.usePlugin(pluginName) function':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.listen(portNumber)':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.listen(http)':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        },
        'Testing MWC.listen(https)':{
            'topic':{},
            'to be created':function(topic){
                throw new Error('Not implemented');
            }
        }
    }
)
    .export(module);
