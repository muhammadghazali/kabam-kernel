#!/usr/bin/env node

/*
This script creates Procfile to run this application via foreman or node-foreman
It requires the application to be able to be started by npm start
https://npmjs.org/doc/cli/npm-start.html
*/

var cwd = process.cwd(),
  fs = require('fs'),
 packageJson = require(cwd+'/package.json');



if(packageJson.scripts && packageJson.scripts.start){
  var startCommand = packageJson.scripts.start;
  console.log('We found commnad to start this application  - '+startCommand);

  fs.exists(cwd+'/Procfile',function(isExists){
    if(isExists){
      console.error('We already have Procfile created!');
      process.exit(1);
    } else {
     var procFileText='web: '+startCommand+'\n';
      fs.writeFile(cwd+'/Procfile',procFileText,function(err){
        if (err) throw err;
        console.log('Procfile created successfully! You can edit it if you want.');
        process.exit(0);
      });
    }
  });

} else {
  console.error('We need this project to be run by `npm start`');
  process.exit(1);
}