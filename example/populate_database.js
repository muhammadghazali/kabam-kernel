var mwc_core = require('./../index.js');
var MWC = new mwc_core(require('./config.json')[(process.env.NODE_ENV) ? (process.env.NODE_ENV) : 'development']);

MWC.populate_database(
    {
        'users': [
            {
                username: "nap",
                email: "ostroumov095@gmail.com",
                active: true
            },
            {
                username: "valmy",
                email: "tbudiman@gmail.com",
                active: true
            }
        ],
        'documents':[]
    }
);