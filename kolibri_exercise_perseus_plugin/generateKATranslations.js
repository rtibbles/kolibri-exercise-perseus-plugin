/*
 * This utility is designed to download Khan Academy po files from crowdin,
 * search through them for interface strings that we need in the Perseus renderer,
 * and then upload them to our Crowdin in order to leverage these translated strings
 * in our own translations.
 */


/*
 * Utility functions for generating the paths for locale files, both locally and on crowdin
 */
const localeFile = (lang, locale) => {
  let langCode;
  if (lang) {
    if (locale) {
      if (locale.length <= 2) {
        locale = locale.toUpperCase();
      } else {
        locale = locale[0].toUpperCase() + locale.slice(1);
      }
    }
    langCode = lang + (locale ? '_' + locale : '') + '/';
  } else {
    langCode = '';
  }
  return `${langCode}LC_FRONTEND_MESSAGES/exercise_perseus_render_module-messages.json`;
};

// Format the language code how crowdin expects it
const crowdinLangCode = (lang, locale) => {
  return lang + (locale ? '-' + locale.toUpperCase() : '');
};

// Path to the locale file for a language in the local locale folder
const localLocaleFile = (lang, locale) => {
  return './locale/' + localeFile(lang, locale);
}

// Which kolibri branch to upload translations to on Crowdin
const kolibriReleaseBranch = 'release-v0.6.x';

// Generate path for Kolibri crowdin translation upload
const remoteLocaleFile = () => {
  return `${kolibriReleaseBranch}/` + localeFile();
}

// Load upthe current English translations file, to give us basis for mapping
// KA translations to Kolibri message ids
const en = require(localLocaleFile('en'));
// Po file parser
const po = require('pofile');
const fs = require('fs');
// Our function for getting i18n messages out of the Perseus source code
const getMessages = require('./getMessages');
// A function for turning a simple ngettext formatted message to ICU syntax
const gettextToICU = require('./gettextToICU');
const https = require('https');
const AdmZip = require('adm-zip');
// Load in API keys from the secrets file.
const {
  kaApiKey,
  kolibriApiKey,
} = require('../crowdinSecrets');
const request = require('request-promise');
const temp = require('temp').track();
const ProgressBar = require('progress');

// List of currently supported languages and associated language and locale codes.
const languages = {
  'es-es': {
    lang: 'es',
    locale: 'es',
    crowdinLocale: 'es',
  },
  'es-mx': {
    lang: 'es',
    locale: 'mx',
    crowdinLocale: 'mx',
    // KA has no es-mx only es-es
    kaLocale: 'es',
  },
  'fr-fr': {
    lang: 'fr',
    locale: 'fr',
    crowdinLocale: null,
  },
  'hi-in': {
    lang: 'hi',
    locale: 'hi',
    crowdinLocale: null,
  },
  'pt-pt': {
    lang: 'pt',
    locale: 'pt',
    crowdinLocale: 'pt',
  },
  'sw-tz': {
    lang: 'sw',
    locale: 'tz',
    crowdinLocale: 'tz',
    kaLocale: null,
  },
};

const kaProjectId = 'khanacademy';

const kolibriProjectId = 'kolibri';

const keyLookup = {};

// Create a reverse lookup from English string to associated id key
// we will use this later to construct the messages object for the
// translated language
Object.keys(en).forEach(key => {
  keyLookup[en[key]] = key;
});

// These seem to be the only files in which the messages we are interested in are found
// This reduces the number of po files we must parse from ~1000 to ~10.
const KAPoFiles = [
  '2_high_priority_content/learn.math.algebra.exercises',
  '2_high_priority_content/learn.math.arithmetic.exercises',
  '2_high_priority_content/learn.math.calculus.exercises',
  '2_high_priority_content/learn.math.geometry.exercises',
  '2_high_priority_content/learn.math.differential-calculus.exercises',
  '2_high_priority_content/learn.math.early-math',
  '2_high_priority_content/learn.math.algebra2.articles',
  '1_high_priority_platform/coach_reports',
  '1_high_priority_platform/_other_',
  '1_high_priority_platform/homepage',
  '1_high_priority_platform/content.chrome',
  '1_high_priority_platform/tags',
  '1_high_priority_platform/mobile.android',
  '1_high_priority_platform/mobile.ios',
  '4_low_priority/labs',
  '4_low_priority/learn.science.physics.exercises',
  '4_low_priority/learn.science.mcat.exercises',
];

/*
 * Function to download the po files, extract the messages, and upload the translations for a language
 */
const downloadAndTransferKATranslations = (language) => {

  // Use the language object above to get relevant codes for the language

  const lang = languages[language].lang;

  const locale = languages[language].locale;

  const crowdinLocale = languages[language].crowdinLocale;

  // For most languages the kaLocale is the same as the regular one, but sometimes they do not make a distinction.

  const kaLocale = typeof languages[language].kaLocale === 'undefined' ? crowdinLocale : languages[language].kaLocale;

  // Url for the zip file of po files - it is possible we could just choose to download the individual po files above instead.

  const zipUrl = `https://api.crowdin.com/api/project/${kaProjectId}/download/${crowdinLangCode(lang, kaLocale)}.zip?key=${kaApiKey}`;

  return new Promise((topResolve, topReject) => {
    // Download the po file first
    const pofileDownloadPromise = new Promise((resolve, reject) => {
      console.log(`Downloading KA Po files for ${language}`);
      const request = https.get(zipUrl, response => {
        // Write to a temp file
        const zipFile = temp.openSync({ suffix: '.zip' }).path;
        const zipStream = fs.createWriteStream(zipFile);
        // Find the total size from the headers, so that we can provide a progress bar
        const size = parseInt(response.headers['content-length'], 10);
        // Make a nice progress bar!
        const downloadBar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: size
        });
        response.on('data', (chunk) => {
          // Whenever we get some data, write it out to the temp file
          zipStream.write(chunk);
          // And upload the progress bar
          downloadBar.tick(chunk.length);
        });
        response.on('end', () => {
          // When the download finishes, end the write stream
          zipStream.end(() => {
            // Then read the temporary zip file
            const zip = new AdmZip(zipFile);

            console.log(`\nKA Po files downloaded for ${language}`);
            // Return our zip file as the result
            resolve(zip);
          });
        });
      });
    }).catch(error => {
      console.log(error);
    });

    Promise.all([getMessages(), pofileDownloadPromise]).then(results => {
      const transMessages = {};
      // We get our message object as the first part of the array (messages here are still in ngettext format)
      // so that we can match them directly with msgIds in KA po files
      const messages = results[0];
      // And the zip file object as the second
      const zip = results[1];

      // KA has a lot of very big pofiles, so rather than trying to merge them all (which will give us memory issues)
      // Just loop through each one and try to find our translations in there.

      console.log(`Extracting translations from KA Po files for ${language}`);
      let done = 0;

      zip.getEntries().forEach(file => {
        // Check to see if the file matches the list we have above
        if (KAPoFiles.some(name => file.entryName.startsWith(name))) {
          // If so, get the text from the file and parse as a po file
          const poFile = po.parse(file.getData().toString('utf8'));
          // Loop through every message that we have extracted from the Perseus source files
          Object.keys(messages).forEach(message => {
            // See if any of the messages in the po file match the message
            const trMsg = poFile.items.find(item => item.msgid === message);
            // If we find a po file item that matches and it has a message string defined
            // and it has a 0th argument (the singular message string), we are in business!
            if (trMsg && trMsg.msgstr && trMsg.msgstr[0]) {
              /* Convert our ngettext format message to ICU format, then look it up in our key lookup from above
               * this gives us the namespaced Kolibri msgId that this message has been set to.
               * Then set the ICU formatted version of the translated message as the string for this key.
               * So, we now have the exact format we should have in our translation files 'msgId': <translatedMessage>
               * in ICU format.
               */
              transMessages[keyLookup[gettextToICU(message)]] = gettextToICU(trMsg.msgstr[0]);
            }
          });
          done += 1;
          console.log(`${done} Po files processed`);
        }
      });

      console.log(`Finished extracting translations for ${language}`);

      console.log(`Uploading translations to ${kolibriProjectId} crowdin for ${language}`);

      // Write out the translated messages to a temporary JSON file.

      const tmpJson = temp.openSync({ suffix: '.json' }).path;

      fs.writeFileSync(tmpJson, JSON.stringify(transMessages), { encoding: 'utf-8' });

      const url = 'https://api.crowdin.com/api/project/' + kolibriProjectId + '/upload-translation';

      // Set up the form data for uploading the translations to Crowdin

      const formData = {
        language: crowdinLangCode(lang, crowdinLocale),
        // This is the format that crowdin expects the files in, as an 'array' with keys representing
        // the file path on crowdin. See the definition of remoteLocaleFile above for how this path is made.
        [`files[${remoteLocaleFile()}]`]: fs.createReadStream(tmpJson),
        // Let's assume that any translations that we upload should be approved
        auto_approve_imported: 1,
      };

      const qs = {
        json: true,
        key: kolibriApiKey
      };
      // Post to Crowdin!
      request.post({
        url,
        qs,
        formData
      }).then(result => {
        console.log(`Uploading for ${language} completed, result: `, result);
        // Success! Clean up all our temp files and resolve the topLevel promise.
        temp.cleanupSync();
        topResolve();
      }).catch(err => {
        topReject(`Uploading translations for ${language} failed with error: ` + err);
      });
    }).catch(err => {
      topReject(`Something went wrong with ${language}, failed with error: ` + err);
    });
  });
};

// Loop through each language in the languages object and run the main function after the previous
// one has finished, do this with a reduce by chaining the returned promisess
Object.keys(languages).reduce((prevPromise, nextLang) => {
  return prevPromise.then(() => downloadAndTransferKATranslations(nextLang)).catch((err) => {
    console.log(err);
    return downloadAndTransferKATranslations(nextLang);
  });
}, Promise.resolve());
