var
  LinkedInStrategy = require('passport-linkedin-oauth2').Strategy,
  linkOAuthProfile = require('./helpers').linkOAuthProfile,
  OAuth2 = require('oauth').OAuth2,
  crypto = require('crypto');

function preprocessProfile(linkedInProfile){
  var skills = [];
  if(linkedInProfile.skills){
    skills = linkedInProfile.skills.values.map(function(value){
      return value.skill.name;
    });
  }
  return {
    educations: linkedInProfile.educations && linkedInProfile.educations.values || [],
    positions: linkedInProfile.positions && linkedInProfile.positions.values || [],
    skills: skills
  };
}

exports.name = 'kabam-core-strategies-linkedin';

exports.strategy = function (core) {
  if (!core.config.PASSPORT || !core.config.PASSPORT.LINKEDIN_API_KEY || !core.config.PASSPORT.LINKEDIN_SECRET_KEY){
    return;
  }
  var
    profileURL = 'https://api.linkedin.com/v1/people/~:(skills,educations,positions)',
    oauth2 = new OAuth2(
      core.config.PASSPORT.LINKEDIN_API_KEY,
      core.config.PASSPORT.LINKEDIN_SECRET_KEY,
      '',
      'https://www.linkedin.com/uas/oauth2/authorization',
      'https://www.linkedin.com/uas/oauth2/accessToken',
      {'x-li-format': 'json'}
    );
  return new LinkedInStrategy({
    clientID: core.config.PASSPORT.LINKEDIN_API_KEY,
    clientSecret: core.config.PASSPORT.LINKEDIN_SECRET_KEY,
    scope: ['r_fullprofile', 'r_emailaddress'],
    callbackURL: core.config.HOST_URL + 'auth/linkedin/callback',
    passReqToCallback: true,
    stateless: true
  }, function (request, accessToken, refreshToken, profile, done) {
    linkOAuthProfile(core, 'linkedin', request, profile, true, function(err, user, created){
      if(err){return done(err);}
      // if we already had this user we shouldn't rewrite their profile, so we skip this step
      if(!created){return done(null, user);}
      // get required profile info and populate user profile
      oauth2.setAccessTokenName('oauth2_access_token');
      oauth2.get(profileURL, accessToken, function(err, body/*, res*/){
        if(err){return done(new Error('LinkedIn error: ' + JSON.stringify(err)));}
        try {
          user.profile = preprocessProfile(JSON.parse(body));
        } catch(err) {
          return done(err);
        }
        user.markModified('profile');
        user.save(function(err){
          done(err, user);
        });
      });
    });
  });
};

exports.routes = function (core) {
  if (!core.config.PASSPORT || !core.config.PASSPORT.LINKEDIN_API_KEY || !core.config.PASSPORT.LINKEDIN_SECRET_KEY){
    return;
  }
  var state = crypto.createHash('md5').update(core.config.SECRET).digest('hex').toString();
  core.app.get('/auth/linkedin', core.passport.authenticate('linkedin', {state: state}));
  core.app.get('/auth/linkedin/callback', core.passport.authenticate('linkedin', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failure'
  }));
};

// TODO: test all this stuff somehow
