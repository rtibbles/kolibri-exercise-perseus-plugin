const {
  localeFile,
  crowdinLangCode,
  localLocaleFile,
  remoteLocaleFile,
  kolibriProjectId,
  downloadTranslations,
  languages,
} = require('./translations');
const {
  kolibriApiKey,
} = require('../crowdinSecrets');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

const downloadTranslation = (language) => {
  // Use the language object above to get relevant codes for the language

  const lang = languages[language].lang;

  const locale = languages[language].locale;

  const crowdinLocale = languages[language].crowdinLocale;

  const crowdinDownloadLocale = languages[language].crowdinDownloadLocale;

  return new Promise((resolve, reject) => {
    // Download the po file first
    const pofileDownloadPromise = downloadTranslations(kolibriProjectId, lang, crowdinLocale, kolibriApiKey);

    pofileDownloadPromise.then(zip => {

      console.log(`Finding translations from Kolibri translation files for ${language}`);

      let translationFile = zip.getEntries().find(file => {
        // Check if this is our message file
        return file.entryName === remoteLocaleFile(lang, crowdinDownloadLocale || locale)
      });

      if (translationFile) {
        // If found, get the text from the file
        translationFile = translationFile.getData().toString('utf8');
      } else {
        console.log(`No perseus renderer message file found for ${language}`);
        reject();
        return;
      }

      console.log(`Finished extracting translations for ${language}`);

      // Write out the translated messages to the appropriate JSON file.
      mkdirp.sync(path.dirname(localLocaleFile(lang, locale)));
      fs.writeFileSync(localLocaleFile(lang, locale), translationFile, { encoding: 'utf-8' });
      resolve();
    }).catch(err => {
      reject(`Something went wrong with ${language}, failed with error: ` + err);
    });
  });
}

// Loop through each language in the languages object and run the main function after the previous
// one has finished, do this with a reduce by chaining the returned promisess
Object.keys(languages).reduce((prevPromise, nextLang) => {
  return prevPromise.then(() => downloadTranslation(nextLang)).catch((err) => {
    console.log(err);
    return err;
  });
}, Promise.resolve());
