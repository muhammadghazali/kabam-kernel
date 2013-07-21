/*
 Core RESTFull api for managing Users
 */

module.exports = exports = function (app, config) {
  app.get('/api/users', function (request, response) {
    request.MODEL.Users.find({active: true}, function (err, users) {
      if (err) {
        throw err;
      }
      response.json(users);
    });
  });
  app.get('/api/users/:username', function (request, response) {
    request.MODEL.Users.findOne({active: true, username: request.params.username}, function (err, user) {
      if (err) {
        throw err;
      }
      if (user) {
        response.json(user);
      } else {
        response.send(404);
      }
    });
  });
  app.put('/api/users/:username', function (request, response) {
    response.send('updating user ' + request.params.username);
  });
  app.delete('/api/users/:username', function (request, response) {
    response.send('deleting user ' + request.params.username);
  });

  app.get('/my', function (request, response) {
    if (request.user) {
      response.json(request.user);
    } else {
      response.status(403);
      response.json({'username': 'Anonimus'});
    }
  });
};

