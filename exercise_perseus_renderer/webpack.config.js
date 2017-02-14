/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');


module.exports = {
  resolve: {
    alias: {
      underscore: 'perseus/lib/underscore'
    },
    modules: [path.resolve(__dirname, 'node_modules/perseus/node_modules')]
  }
};
