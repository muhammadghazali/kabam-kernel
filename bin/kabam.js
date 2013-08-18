#!/usr/bin/env node
var program = require('commander'),
  pkg = require('../package.json'),
  cwd = process.cwd(),
  fs = require('fs'),
  colors = require('colors'),
  packageJson = require(cwd+'/package.json');

program
  .version(pkg.version)
  .usage('[command] <parameters ...>')
  .option('-v, --verbose',' be verbose')
;

program
  .command('create')
  .description('Create basic application structure in current directory')
//  .option("-s, --setup_mode [mode]", "Which setup mode to use")
  .action(function(){
    console.log('creating');
    process.exit(0);
  });

program
  .command('publishAssets')
  .description('Publish modules templates, css, javascripts and images')
  .action(function(){
    console.log('Publishing...');
    process.exit(0);

  });

program
  .command('signup <username> <email> <password> [isVerified]')
  .description('Create new user')
  .action(function(username,email,password,isVerified){
    console.log(username+' '+email+' '+password+' '+isVerified);
    process.exit(0);
  });

program
  .command('resetPassword <usernameOrEmail> <password>')
  .description('Reset password for user')
  .action(function(username,email,password,isVerified){
    console.log(username+' '+email+' '+password+' '+isVerified);
    process.exit(0);
  });

program
  .command('banUser <usernameOrEmail>')
  .description('Ban user')
  .action(function(username,email,password,isVerified){
    console.log(username+' '+email+' '+password+' '+isVerified);
    process.exit(0);
  });

program
  .command('grant <usernameOrEmail> <role>')
  .description('Grant role to user')
  .action(function(username,email,password,isVerified){
    console.log(username+' '+email+' '+password+' '+isVerified);
    process.exit(0);
  });

program
  .command('revoke <usernameOrEmail> <role>')
  .description('Revoke role from user')
  .action(function(username,email,password,isVerified){
    console.log(username+' '+email+' '+password+' '+isVerified);
    process.exit(0);
  });

program
  .command('procfile')
  .description('create Procfile for Foreman or nodeForeman')
  .action(function(){
    if(packageJson.scripts && packageJson.scripts.start){
      var startCommand = packageJson.scripts.start;
//      console.log('We found command to start this application  - '+startCommand);

      var procFileText='web: '+startCommand+'\n';
      fs.exists(cwd+'/Procfile',function(isExists){
        if(isExists){
          console.error('We already have Procfile created!'.red);
          process.exit(1);
        } else {
//          console.log('Trying to write');
//          console.log(procFileText);
//          console.log(cwd+'/Procfile');

          fs.writeFile(cwd+'/Procfile',procFileText,function(err){
            if (err) throw err;
            console.log('Procfile created successfully! You can edit it if you want.'.green);
            process.exit(0);
          });
        }
      });

    } else {
      console.error('We need this project to be run by `npm start`'.red);
      process.exit(1);
    }
  });

program.on('--help', function(){
  console.log(' Examples');
  console.log((' $ kabam signup JohnDoe JohnDoe@gmail.com 123Susan true').bold);
  console.log((' $ kabam grant JohnDoe rulerOfTheWorld').bold);
  console.log((' $ kabam revoke JohnDoe rulerOfTheWorld').bold);
  console.log((' $ kabam resetPassword JohnDoe secret111').bold);
  console.log((' $ kabam banUser JohnDoe').bold);
});


program.parse(process.argv);
console.log(('Kabam-Cli version '+pkg.version).bold.yellow.redBG);
if(process.argv.length===2){
  program.outputHelp();
}

