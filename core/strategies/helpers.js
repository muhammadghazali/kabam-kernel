function processProfile(profile){
  var firstName, lastName, name;
  // trying to get first name and last name
  if(profile.displayName){
    // it tries to split the name by spaces using the first element as first name and everything other as last name
    // so if the user has a name like John Malkovich it will make firstName='John' and lastName='Malkovich'
    name = profile.displayName.split(' ');
    firstName = name[0];
    if(name.length > 1){
      lastName = name.slice(1).join(' ');
    }
  }

  // if profile has given and family names try to use them instead
  if(profile.name && profile.name.givenName){
    firstName = profile.name.givenName;
  }
  if(profile.name && profile.name.familyName){
    lastName = profile.name.familyName;
  }
  profile.firstName = firstName;
  profile.lastName = lastName;
  return profile;
}

module.exports.processProfile = processProfile;

module.exports.linkOAuthProfile = function(kernel, providerName, request, profile, done){
  // twitter -> Twitter
  var serviceName = (providerName.charAt(0).toUpperCase() + providerName.slice(1));

  //  console.log('~~~~~~~~~~~~~');
  //  console.log(profile);
  //  console.log('~~~~~~~~~~~~~');

  // basic profile validation
  if (!(profile.provider === providerName && profile.id)) {
    return done(new Error('There is something strange instead of user profile!'));
  }

  profile = processProfile(profile);

  kernel.model.User.linkWithService(request.user, profile, false, function(err, user, info){
    if(err){
      // request.flash('error', 'Unable to signin via '+serviceName+'!');
      // this is likely a database error, show 500 to the user
      return done(err);
    }
    // if info is just a true we created a new user
    if(info===true){
      request.flash('success', 'Your github profile has been linked with your '+serviceName+' account! ' +
        'You can authorize via '+serviceName+' now!');
    }
    // if we don't have a user and have info with object then this is error message, we should flash it
    if(!user && info.message){
      request.flash('error', info.message);
    }
    done(null, user);
  });
};