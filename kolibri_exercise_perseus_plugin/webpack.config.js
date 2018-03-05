/*
 * This file defines additional webpack configuration for this plugin.
 * It will be bundled into the webpack configuration at build time.
 */
var path = require('path');
var webpack = require('perseus/node_modules/webpack');

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
            // Replace this deletion of a local variable (illegal in strict mode)
            // With deletion of the variable from the window object
            {
              search: /delete Raphael;$/,
              replace: 'delete win.Raphael',
              flags: 'g'
            },
            // Remove an attempt to import jQuery from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /jQuery \= window\.jQuery,/,
              replace: '',
              flags: 'g'
            },
            // Remove an attempt to import MathQuill from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /const MathQuill \= window\.MathQuill;/,
              replace: '',
              flags: 'g'
            },
            // Remove an attempt to import i18n from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /const i18n \= window\.i18n;/,
              replace: '',
              flags: 'g'
            },
            // Remove an attempt to reference katex from the window object, so that
            // it can be properly imported by the provide plugin
            {
              search: /window\.katex/,
              replace: 'katex',
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
      {
        test: /perseus\/lib\/kas\.js$/,
        loader: 'string-replace-loader',
        enforce: 'pre',
        options: {
          search: /\)\(KAS\)/,
          replace: ')(window.KAS)',
          flags: 'g'
        },
      },
    ]
  },
  resolve: {
    alias: {
      // For some reason the jsx react component files are inside a folder call 'js'
      'react-components': 'react-components/js',
      'KAGlobals': path.resolve(path.join(__dirname, 'assets', 'src', 'KAGlobals')),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      // Use the provide plugin to inject modules into the scope of other modules
      // when those modules reference particular global variables
      // This allows us to make jQuery and other modules available without polluting our global scope
      jQuery: 'jquery',
      $: 'jquery',
      _: 'underscore',
      katex: 'perseus/lib/katex/katex',
      KAS: 'imports-loader?window=>{}!exports-loader?window.KAS!perseus/lib/kas',
      MathQuill: 'imports-loader?window=>{}!exports-loader?window.MathQuill!perseus/lib/mathquill/mathquill-basic',
      // 'window.icu': 'KAGlobals/icu',
      Exercises: 'KAGlobals/Exercises',
      Khan: 'KAGlobals/Khan',
      i18n: 'KAGlobals/i18n',
      $_: 'KAGlobals/$_',
    }),
  ],
  // Parse the path of the perseus node_modules directory into our build machinery,
  // in order to allow babel to resolve the presets that are in this particular dir
  nodePaths: [path.resolve(path.join(__dirname, 'node_modules', 'perseus', 'node_modules'))],
};
