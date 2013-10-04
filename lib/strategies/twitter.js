'use strict';
var TwitterStrategy = require('passport-twitter').Strategy;

exports.strategy = function (core) {
  return new TwitterStrategy({
    consumerKey: core.config.PASSPORT.TWITTER_CONSUMER_KEY,
    consumerSecret: core.config.PASSPORT.TWITTER_CONSUMER_SECRET,
    callbackURL: core.config.HOST_URL + 'auth/twitter/callback',
    passReqToCallback: true,
    stateless: true  // http://stackoverflow.com/questions/17274447/does-passport-js-require-session-affinity-when-deployed-on-multiple-node-js-inst
  }, function (request, token, tokenSecret, profile, done) {
//    console.log('==============AUTH VIA TWITTER');
//    console.log(profile);
//    console.log('==============');
    if (profile.provider === 'twitter' && profile.id) {
      if (request.user) {
        //attaching twitter profile
        request.user.setKeyChain('twitter', profile.id, function (err) {
          request.flash('success', 'Your twitter profile has been attached to your account! You can authorize via Twitter.com now!');
          done(err, request.user);
        });
      } else {
        core.model.Users.findOneByKeychain('twitter', profile.id, function (err, userFound) {
          if (err) {
            done(err);
          } else {
            if (userFound) {
              done(null, userFound);
            } else {
              request.flash('error', 'Unable to signin via twitter.com! Please, register with username, email and password and than attach your twitter profile to it!');
              done(null, false);
            }
          }
        });
      }
    } else {
      return done(new Error('There is something strange instead of user profile!'));
    }
  });

};

exports.routes = function (passport, core) {
  core.app.get('/auth/twitter', passport.authenticate('twitter'));
  core.app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/auth/success', failureRedirect: '/auth/failure' }));
};


//example of profile

/*
 ==============
 { provider: 'twitter',
 id: 544568648,
 username: 'teksiru',
 displayName: 'Издательство Текси',
 photos: [ { value: 'https://si0.twimg.com/profile_images/2397328754/icg4gpcq5njeki3pdhrz_normal.png' } ],
 _raw: '{"id":544568648,"id_str":"544568648","name":"\\u0418\\u0437\\u0434\\u0430\\u0442\\u0435\\u043b\\u044c\\u0441\\u0442\\u0432\\u043e \\u0422\\u0435\\u043a\\u0441\\u0438","screen_name":"teksiru","location":"\\u0420\\u043e\\u0441\\u0441\\u0438\\u044f, \\u041c\\u043e\\u0441\\u043a\\u0432\\u0430","description":"\\u041e\\u0444\\u0438\\u0446\\u0438\\u0430\\u043b\\u044c\\u043d\\u044b\\u0439 \\u0430\\u043a\\u043a\\u0430\\u0443\\u043d\\u0442 \\u0434\\u043b\\u044f \\u0438\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u043e\\u043d\\u043d\\u043e\\u0439 \\u043f\\u043e\\u0434\\u0434\\u0435\\u0440\\u0436\\u043a\\u0438 \\u0441\\u0432\\u043e\\u0431\\u043e\\u0434\\u043d\\u043e\\u0433\\u043e \\u0438\\u0437\\u0434\\u0430\\u0442\\u0435\\u043b\\u044c\\u0441\\u0442\\u0432\\u0430 \\u0422\\u0435\\u043a\\u0441\\u0438","url":"http:\\/\\/t.co\\/XOvdFmIX8T","entities":{"url":{"urls":[{"url":"http:\\/\\/t.co\\/XOvdFmIX8T","expanded_url":"http:\\/\\/teksi.ru","display_url":"teksi.ru","indices":[0,22]}]},"description":{"urls":[]}},"protected":false,"followers_count":10,"friends_count":15,"listed_count":0,"created_at":"Tue Apr 03 20:29:53 +0000 2012","favourites_count":0,"utc_offset":14400,"time_zone":"Moscow","geo_enabled":false,"verified":false,"statuses_count":4173,"lang":"ru","status":{"created_at":"Tue Jul 30 13:58:02 +0000 2013","id":362210474927988736,"id_str":"362210474927988736","text":"http:\\/\\/t.co\\/ZLfUrc3c4U","source":"web","truncated":false,"in_reply_to_status_id":null,"in_reply_to_status_id_str":null,"in_reply_to_user_id":null,"in_reply_to_user_id_str":null,"in_reply_to_screen_name":null,"geo":null,"coordinates":null,"place":null,"contributors":null,"retweet_count":0,"favorite_count":0,"entities":{"hashtags":[],"symbols":[],"urls":[],"user_mentions":[],"media":[{"id":362210474932183041,"id_str":"362210474932183041","indices":[0,22],"media_url":"http:\\/\\/pbs.twimg.com\\/media\\/BQbUggRCIAEoLwf.jpg","media_url_https":"https:\\/\\/pbs.twimg.com\\/media\\/BQbUggRCIAEoLwf.jpg","url":"http:\\/\\/t.co\\/ZLfUrc3c4U","display_url":"pic.twitter.com\\/ZLfUrc3c4U","expanded_url":"http:\\/\\/twitter.com\\/teksiru\\/status\\/362210474927988736\\/photo\\/1","type":"photo","sizes":{"large":{"w":1024,"h":683,"resize":"fit"},"small":{"w":340,"h":227,"resize":"fit"},"thumb":{"w":150,"h":150,"resize":"crop"},"medium":{"w":600,"h":400,"resize":"fit"}}}]},"favorited":false,"retweeted":false,"possibly_sensitive":false,"lang":"und"},"contributors_enabled":false,"is_translator":false,"profile_background_color":"356AA0","profile_background_image_url":"http:\\/\\/a0.twimg.com\\/images\\/themes\\/theme18\\/bg.gif","profile_background_image_url_https":"https:\\/\\/si0.twimg.com\\/images\\/themes\\/theme18\\/bg.gif","profile_background_tile":false,"profile_image_url":"http:\\/\\/a0.twimg.com\\/profile_images\\/2397328754\\/icg4gpcq5njeki3pdhrz_normal.png","profile_image_url_https":"https:\\/\\/si0.twimg.com\\/profile_images\\/2397328754\\/icg4gpcq5njeki3pdhrz_normal.png","profile_link_color":"1E08C7","profile_sidebar_border_color":"C0DEED","profile_sidebar_fill_color":"DDEEF6","profile_text_color":"333333","profile_use_background_image":true,"default_profile":false,"default_profile_image":false,"following":false,"follow_request_sent":false,"notifications":false}',
 _json:
 { id: 544568648,
 id_str: '544568648',
 name: 'Издательство Текси',
 screen_name: 'teksiru',
 location: 'Россия, Москва',
 description: 'Официальный аккаунт для информационной поддержки свободного издательства Текси',
 url: 'http://t.co/XOvdFmIX8T',
 entities: { url: [Object], description: [Object] },
 protected: false,
 followers_count: 10,
 friends_count: 15,
 listed_count: 0,
 created_at: 'Tue Apr 03 20:29:53 +0000 2012',
 favourites_count: 0,
 utc_offset: 14400,
 time_zone: 'Moscow',
 geo_enabled: false,
 verified: false,
 statuses_count: 4173,
 lang: 'ru',
 status:
 { created_at: 'Tue Jul 30 13:58:02 +0000 2013',
 id: 362210474927988740,
 id_str: '362210474927988736',
 text: 'http://t.co/ZLfUrc3c4U',
 source: 'web',
 truncated: false,
 in_reply_to_status_id: null,
 in_reply_to_status_id_str: null,
 in_reply_to_user_id: null,
 in_reply_to_user_id_str: null,
 in_reply_to_screen_name: null,
 geo: null,
 coordinates: null,
 place: null,
 contributors: null,
 retweet_count: 0,
 favorite_count: 0,
 entities: [Object],
 favorited: false,
 retweeted: false,
 possibly_sensitive: false,
 lang: 'und' },
 contributors_enabled: false,
 is_translator: false,
 profile_background_color: '356AA0',
 profile_background_image_url: 'http://a0.twimg.com/images/themes/theme18/bg.gif',
 profile_background_image_url_https: 'https://si0.twimg.com/images/themes/theme18/bg.gif',
 profile_background_tile: false,
 profile_image_url: 'http://a0.twimg.com/profile_images/2397328754/icg4gpcq5njeki3pdhrz_normal.png',
 profile_image_url_https: 'https://si0.twimg.com/profile_images/2397328754/icg4gpcq5njeki3pdhrz_normal.png',
 profile_link_color: '1E08C7',
 profile_sidebar_border_color: 'C0DEED',
 profile_sidebar_fill_color: 'DDEEF6',
 profile_text_color: '333333',
 profile_use_background_image: true,
 default_profile: false,
 default_profile_image: false,
 following: false,
 follow_request_sent: false,
 notifications: false } }
 ==============


 */
