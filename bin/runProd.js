#!/usr/bin/env node

var os = require('os'), //cpus
  child_process = require('child_process'),
  cpus=os.cpus(),
  numCPUs=cpus.length;


console.log('You have '+numCPUs+' CPU cores available.');
console.log('Scaling application for '+numCPUs+' process, 1 process per 1 core.');


var nf = child_process.spawn('node',['node_modules/.bin/nf.js', ('web='+numCPUs)],function(err,stdout,stderr){
  if(err) throw err;
  console.log(stderr);
  console.log(stdout);
});

//setTimeout(nf.disconnect, 1000);

