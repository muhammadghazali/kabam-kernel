// Usage:
// var express = require('express')
// require('enableMultipleViewRoots')(express)

//origin - https://gist.github.com/naholyr/995474

module.exports = function (express) {
  //console.log(express);

  var old = express.settings.view.lookup;

  function lookup(view, options) {
    // If root is an array of paths, let's try each path until we find the view
    if (options.root instanceof Array) {
      var opts = {};
      for (var key in options) {
        opts[key] = options[key];
      }

      var root = opts.root,
        foundView = null;

      for (var i = 0; i < root.length; i++) {
        opts.root = root[i];
        foundView = lookup.call(this, view, opts);
        if (foundView.exists) {
          break;
        }
      }
      return foundView;
    } else {
      // Fallback to standard behavior, when root is a single directory
      return old.call(express.settings.view, view, options);
    }
  }
  express.settings.view.lookup = lookup;
};