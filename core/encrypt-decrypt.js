var crypto = require('crypto');

// Encryption/description utilities for the kernel


exports.name = 'kabam-encrypt-decrypt';

exports.core = function(kernel){
  kernel.encrypt = function encrypt(text, secret){
    secret || (secret = kernel.config.SECRET);
    var cipher = crypto.createCipher('aes-256-cbc', secret);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
  };

  kernel.decrypt = function decrypt(text, secret){
    secret || (secret = kernel.config.SECRET);
    var decipher = crypto.createDecipher('aes-256-cbc', secret);
    var dec = decipher.update(text, 'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
  }
};