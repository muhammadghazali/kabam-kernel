module.exports = function(kernel, providerName, request, profile, done){
  // twitter -> Twitter
  var serviceName = (providerName.charAt(0).toUpperCase() + providerName.slice(1));

//  console.log('~~~~~~~~~~~~~');
//  console.log(profile);
//  console.log('~~~~~~~~~~~~~');

  // basic profile validation
  if (!(profile.provider === providerName && profile.id)) {
    return done(new Error('There is something strange instead of user profile!'));
  }

  kernel.model.User.linkWithService(request.user, profile, false, function(err, user, created){
    if(err){
      request.flash('error', 'Unable to signin via '+serviceName+'! Please, register with username, ' +
        'email and password and than attach your github profile to it!');
      return done(err);
    }
    if(created){
      request.flash('success', 'Your github profile has been linked with your '+serviceName+' account! ' +
        'You can authorize via '+serviceName+' now!');
    }
    done(null, user);
  });
};