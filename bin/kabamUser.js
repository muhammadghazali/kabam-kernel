#!/usr/bin/env node
var program = require('commander'),
  pkg = require('../package.json'),
  cwd = process.cwd(),
  fs = require('fs'),
  colors = require('colors');

program
  .version(pkg.version)
  .usage('[command] <parameters ...>')
  .option('-v, --verbose',' be verbose')
;

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


program.on('--help', function(){
  console.log(' Examples');
  console.log((' $ kabam signup JohnDoe JohnDoe@gmail.com 123Susan true').bold);
  console.log((' $ kabam grant JohnDoe rulerOfTheWorld').bold);
  console.log((' $ kabam revoke JohnDoe rulerOfTheWorld').bold);
  console.log((' $ kabam resetPassword JohnDoe secret111').bold);
  console.log((' $ kabam banUser JohnDoe').bold);
});


program.parse(process.argv);
console.log(('KabamUser version '+pkg.version).bold.yellow.redBG);
if(process.argv.length===2){
  program.outputHelp();
}

