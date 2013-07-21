module.exports = exports = function (app, config) {
  app.get('/api/documents', function (request, response) {
    response.send('returning all documents');
  });
  app.get('/api/documents/:documentId', function (request, response) {
    response.send('getting document with id = ' + request.params.documentId);
  });
  app.put('/api/documents/:documentId', function (request, response) {
    response.send('updating document with id = ' + request.params.documentId);
  });
  app.delete('/api/users/:documentId', function (request, response) {
    response.send('deleting document with id = ' + request.params.documentId);
  });
};