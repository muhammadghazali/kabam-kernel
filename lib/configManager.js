'use strict';
/**
 * Chuck Norris edition
 * If kernel do not have proper config object, it tries to create it by itself,
 * Sometimes he is successefull
 */

var os = require('os'),
  crypto = require('crypto'),
  colors = require('colors');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}


exports.getSecret = function (fallback) {
  if (fallback) {
    return fallback;
  } else {
    console.log('Warning!'.yellow + ' config.secret is missing! Generating the secret on the fly...');
    return (md5(JSON.stringify(os)));
  }
};

exports.getHostUrl = function (fallback) {
  if (fallback) {
    return fallback;
  } else {
    var myHostName = 'http://' + os.hostname() + '/'; //todo - i', still thinking this is stupid - Anatolij
    console.log('Warning!'.yellow + ' config.hostUrl is missing! Assuming your hostname is ' + myHostName);
    return  myHostName;
  }
};

exports.getRedisUrl = function (fallback) {
  if (process.env.REDISTOGO_URL) {
    console.log('ConfigManager:Redis '.green + ' extracted value from process.env.REDISTOGO_URL.');
    return process.env.REDISTOGO_URL;
  }
  if (process.env.OPENREDIS_URL) {
    console.log('ConfigManager:Redis '.green + ' extracted value from process.env.OPENREDIS_URL.');
    return process.env.OPENREDIS_URL;
  }
  if (process.env.REDISCLOUD_URL) {
    console.log('ConfigManager:Redis '.green + ' extracted value from process.env.REDISCLOUD_URL.');
    return process.env.REDISCLOUD_URL;
  }
  if (process.env.REDISGREEN_URL) {
    console.log('ConfigManager:Redis '.green + ' extracted value from process.env.REDISGREEN_URL.');
    return process.env.REDISGREEN_URL;
  }
  if (process.env.redis) {
    console.log('ConfigManager:Redis '.green + ' extracted value from process.env.redis.');
    return process.env.redis;
  }

  if (fallback) {
    console.log('ConfigManager:Redis '.green + ' using fallback.');
    return fallback;
  } else {
    console.error('No redis database provider installed!  ' +
      'Install one of https://addons.heroku.com/openredis, ' +
      'https://addons.heroku.com/rediscloud, ' +
      'https://addons.heroku.com/redisgreen, ' +
      'https://addons.heroku.com/redistogo. We use default settings now redis://"":""@localhost:6379');
    return null;
  }
};

exports.getMongoUrl = function (fallback) {
  if (process.env.MONGOLAB_URI) {
    console.log('ConfigManager:Mongo '.green + ' using process.env.MONGOLAB_URI.');
    return process.env.MONGOLAB_URI;
  }
  if (process.env.MONGOHQ_URL) {
    console.log('ConfigManager:Mongo '.green + ' using process.env.MONGOHQ_URL.');
    return process.env.MONGOHQ_URL;
  }
  if (process.env.mongoUrl) {
    console.log('ConfigManager:Mongo '.green + ' using process.env.mongoUrl.');
    return process.env.mongoUrl;
  }

  if (fallback) {
    console.log('ConfigManager:Mongo '.green + ' using fallback.');
    return fallback;
  } else {
    console.error('No mongo database provider installed!  ' +
      'Install one of ' +
      'https://addons.heroku.com/mongolab or https://addons.heroku.com/mongohq addons.' +
      'We use default settings now - mongodb://localhost/kabam_test');
    return 'mongodb://localhost/kabam_test';
  }
};