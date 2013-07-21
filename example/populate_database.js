var mwcCore = require('./../index.js');
var MWC = new mwcCore(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);

MWC.populateDatabase(
  {
    'users': [
      {
        username: 'nap',
        email: 'ostroumov095@gmail.com',
        active: true
      },
      {
        username: 'valmy',
        email: 'tbudiman@gmail.com',
        active: true
      }
    ],
    'documents': []
  }
);