/*
 * A utility that extracts Perseus messages into a Javascript file for compatibility
 * with our i18n machinery. Also converts them into ICU format in the process.
 */

const fs = require('fs');

const gettextToICU = require('./gettextToICU');

// We already have underscore installed, so use it for templating the code we generate
const underscore = require('underscore');

const getMessages = require('./getMessages');

// Auto generate a module that creates the translator so that it can
// be imported into our special i18n code for Perseus.

const template = `/* eslint-disable */

import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('perseusInternalMessages', {
<% _.each(messages, function(value, key) { %>  "<%= key %>": "<%= value %>",\n<% }); %>});

export default translator;`

getMessages(gettextToICU).then(messages => {

  // Use underscore template to fill in the above 'messages' into the template
  const outputCode = underscore.template(template)({ messages });

  // Write out the module to src files

  fs.writeFileSync('./assets/src/translator.js', outputCode, { encoding: 'utf-8' });
});
