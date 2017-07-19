/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');
var webpack = require('webpack');

module.exports = {
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules/perseus/node_modules')]
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, 'node_modules/perseus/node_modules')]
  },
  module: {
    rules: [
      {
        test: /perseus\/[\w\/\-\_]*\.jsx?$/,
        loader: 'string-replace-loader',
        enforce: 'pre',
        options: {
          multiple: [
            // Replace url reference to throbber.gif to be in a findable location
            {
              search: '"url(/images/throbber.gif) no-repeat"',
              replace: '"url(/static/images/throbber.gif) no-repeat"'
            },
            // Replace ngettext style messages with ICU syntax
            {
              search: /%\(([\w_]+)\)s/,
              replace: '{ $1 }',
              flags: 'g'
            },
          ]
        }
      },
      {
        // Use the perseus modified version of jsx loader to load any jsx files
        // and any files inside perseus src and math-input as they use
        // object spread syntax and need to be passed through babel
        test: /(perseus\/(src|math\-input)\/[\w\/\-\_]*\.jsx?$)|(\.jsx$)/,
        loader: path.join(__dirname, "./node_modules/perseus/node/jsx-loader.js"),
      },
      }
    ]
  },
  // Parse the path of the perseus node_modules directory into our build machinery,
  // in order to allow babel to resolve the presets that are in this particular dir
  nodePaths: [path.resolve(path.join(__dirname, 'node_modules', 'perseus', 'node_modules'))],
};
