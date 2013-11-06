'use strict';
/**
 * If kernel do not have proper config object, it tries to create it by itself,
 * Sometimes it is successful
 */

var os = require('os'),
  crypto = require('crypto'),
// jshint unused: false
  colors = require('colors'),
  url = require('url'),
  _ = require('lodash'),
  logger = require('./logging').getLogger(module);

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}

var defaults = {
  ENV: function (value) {
    return value || process.env.NODE_ENV || 'development';
  },

  SECRET: function (value) {
    if (value) {
      return value;
    }
    logger.warn('config.SECRET is missing! Generating the secret on the fly...');
    return (md5(JSON.stringify(os)));
  },

  PORT: function (value) {
    return value || process.env.PORT || 3000;
  },

  /**
   * @return {string}
   */
  HOST_URL: function (value) {
    if (value) {
      return value;
    }
    if (process.env.HOST_URL) {
      return process.env.HOST_URL;
    }
    var hostname = os.hostname();
    if (this.ENV === 'development') {
      hostname = 'localhost';
    }
    return 'http://' + hostname + ':' + this.PORT + '/';
  },

  EMAIL_CONFIG: function (value) {
    if(value){return value;}
    if(process.env.EMAIL_CONFIG){return process.env.EMAIL_CONFIG;}
  },

  /**
   * @return {string}
   */
  REDIS: function (value) {
    if (process.env.REDISTOGO_URL) {
      logger.info('ConfigManager:REDIS '.green + ' extracted value from process.env.REDISTOGO_URL.');
      return process.env.REDISTOGO_URL;
    }
    if (process.env.OPENREDIS_URL) {
      logger.info('ConfigManager:REDIS '.green + ' extracted value from process.env.OPENREDIS_URL.');
      return process.env.OPENREDIS_URL;
    }
    if (process.env.REDISCLOUD_URL) {
      logger.info('ConfigManager:REDIS '.green + ' extracted value from process.env.REDISCLOUD_URL.');
      return process.env.REDISCLOUD_URL;
    }
    if (process.env.REDISGREEN_URL) {
      logger.info('ConfigManager:REDIS '.green + ' extracted value from process.env.REDISGREEN_URL.');
      return process.env.REDISGREEN_URL;
    }
    if (process.env.REDIS_URL) {
      logger.info('ConfigManager:REDIS '.green + ' extracted value from process.env.REDIS_URL.');
      return process.env.REDIS_URL;
    }
    if (value) {
      logger.info('ConfigManager:REDIS '.green + ' using configured value.');
      return value;
    }

    logger.info('No redis database provider installed! Install one of https://addons.heroku.com/openredis, ' +
      'https://addons.heroku.com/rediscloud, https://addons.heroku.com/redisgreen, ' +
      'https://addons.heroku.com/redistogo. We use default settings now redis://"":""@localhost:6379');

    return null;
  },

  PASSPORT: function (value) {
    // jshint expr: true
    value || (value = {});
    [
      'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'TWITTER_CONSUMER_KEY', 'TWITTER_CONSUMER_SECRET',
      'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'LINKEDIN_API_KEY', 'LINKEDIN_SECRET_KEY'
    ].forEach(function (variable) {
      process.env[variable] && (value[variable] = process.env[variable]);
    });
    return value;
  },

  /**
   * @return {string}
   */
  MONGO_URL: function (value) {
    if (process.env.MONGOLAB_URI) {
      logger.info('ConfigManager:MONGO_URL '.green + ' using process.env.MONGOLAB_URI.');
      return process.env.MONGOLAB_URI;
    }
    if (process.env.MONGOHQ_URL) {
      logger.info('ConfigManager:MONGO_URL '.green + ' using process.env.MONGOHQ_URL.');
      return process.env.MONGOHQ_URL;
    }
    if (process.env.MONGO_URL) {
      logger.info('ConfigManager:MONGO_URL '.green + ' using process.env.MONGO_URL.');
      return process.env.MONGO_URL;
    }
    if (value) {
      logger.info('ConfigManager:MONGO_URL '.green + ' using configured value.');
      return value;
    }

    logger.info('No MongoDB URL provided and no database provider configured! Install one of ' +
      'https://addons.heroku.com/mongolab or https://addons.heroku.com/mongohq addons.' +
      'We use default settings now - mongodb://localhost/kabam_dev');

    return 'mongodb://localhost/kabam_dev';
  },

  CHAT: function (value){
    // jshint expr: true
    value || (value = {});
    var defaults = {
      XMPP_HOST: 'localhost',
      XMPP_PORT: 5222,
      XMPP_BIND_PORT: 5280,
      XMPP_ADMIN: 'admin@localhost',
      XMPP_ADMIN_PASSWORD: 'admin'
    };

    Object.keys(defaults).forEach(function(key){
      value[key] || (value[key] = defaults[key]);
    });

    ['XMPP_HOST', 'XMPP_PORT', 'XMPP_BIND_PORT', 'XMPP_ADMIN', 'XMPP_ADMIN_PASSWORD'].forEach(function (variable) {
      process.env['CHAT_' + variable] && (value[variable] = process.env['CHAT_' + variable]);
    });

    return value;

  }
};

function validate(config) {
  if (!(config.HOST_URL && url.parse(config.HOST_URL).hostname)) {
    throw new Error('Config.HOST_URL have to be valid hostname - for example, ' +
      'http://example.org/ with http(s) on start and "/" at end!');
  }
  if (config.SECRET.length < 9) {
    throw new Error('Config.SECRET is to short!');
  }
  return config;
}

function makeConfig(config, defaults) {
  if (typeof config !== 'object') {
    throw new Error('Config is not an object!');
  }
  var key;
  // we don't want to modify original object
  config = _.cloneDeep(config);
  // iterate over default values and calling factories
  for (key in defaults) {
    config[key] = defaults[key].call(config, config[key]);
  }
  return validate(config);
}

module.exports = function (config) {
  return makeConfig(config, defaults);
};
